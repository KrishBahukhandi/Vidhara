/**
 * Liveness + readiness probe (architecture.md §12).
 *
 * Two fields, deliberately separate:
 *
 * `ok` is **liveness** — it is true whenever this function runs at all, and it
 * carries `minSupportedAppVersion` for the app's forced-upgrade gate. It must
 * stay independent of the database: an app that works offline-first must never
 * be blocked from booting because Supabase had a blip.
 *
 * `db` is **readiness** — one cheap indexed read against published content.
 * Every page on this site is database-backed, so "Vercel answered" is not the
 * outage worth paging about; "Supabase is unreachable" is. Until this existed,
 * the uptime monitor returned green through a total database failure, which is
 * the specific false comfort architecture.md §309 already claimed we had.
 *
 * The status code stays 200 in both cases, so the upgrade gate always gets its
 * answer. The uptime monitor distinguishes them with a keyword check on
 * `"db":"up"` rather than on the status code.
 */
import { getServerClient, isContentConfigured } from "@/lib/supabase-server";

// Never cache: a cached "up" is indistinguishable from a live one, and a probe
// that can be served from cache is not a probe.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB_TIMEOUT_MS = 3000;

async function checkDb(): Promise<"up" | "down" | "unconfigured"> {
  if (!isContentConfigured) return "unconfigured";
  try {
    // Bounded so a hanging database cannot hang the probe itself — a health
    // check that times out reads as a total outage to the monitor.
    const result = await Promise.race([
      getServerClient().from("acts").select("id", { head: true, count: "exact" }).limit(1),
      new Promise<{ error: Error }>((resolve) =>
        setTimeout(() => resolve({ error: new Error("timeout") }), DB_TIMEOUT_MS),
      ),
    ]);
    return "error" in result && result.error ? "down" : "up";
  } catch {
    return "down";
  }
}

export async function GET() {
  const db = await checkDb();
  return Response.json(
    {
      ok: true,
      service: "vidhara-web",
      version: "0.1.0",
      minSupportedAppVersion: "0.1.0",
      db,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
