/**
 * On-demand cache invalidation for a corrected section.
 *
 * Section pages are ISR-cached for an hour (D-017 noted the consequence: a
 * content fix shows on fresh renders immediately but cached pages lag). For a
 * corpus where a wrong section is a Sev-0 (D-011), an hour of serving text we
 * know to be wrong is the wrong default.
 *
 * Secret-gated because revalidation is a cache-eviction primitive: unguarded,
 * anyone could force every page to regenerate on demand. The secret lives in
 * Vercel's env, never in the client bundle — note the absence of a
 * NEXT_PUBLIC_ prefix, which is what keeps it server-side.
 *
 * Inert without the secret, like every other capability here: no secret set
 * means the route refuses everything rather than defaulting to open.
 */
import { revalidatePath } from "next/cache";

const SECRET = process.env.REVALIDATE_SECRET;

export async function POST(request: Request) {
  if (!SECRET) {
    return Response.json(
      { ok: false, error: { code: "PROVIDER_UNAVAILABLE", message: "Revalidation is not configured." } },
      { status: 503 },
    );
  }
  if (request.headers.get("x-revalidate-secret") !== SECRET) {
    return Response.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Bad or missing secret." } },
      { status: 401 },
    );
  }

  let body: { paths?: unknown };
  try {
    body = (await request.json()) as { paths?: unknown };
  } catch {
    return Response.json(
      { ok: false, error: { code: "VALIDATION_FAILED", message: "Body must be JSON." } },
      { status: 400 },
    );
  }

  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];
  if (paths.length === 0) {
    return Response.json(
      { ok: false, error: { code: "VALIDATION_FAILED", message: "Send { paths: [\"/acts/ipc/420\"] }." } },
      { status: 400 },
    );
  }
  // Bounded: a publish touching thousands of sections should revalidate the act
  // page, not enqueue thousands of individual regenerations.
  if (paths.length > 100) {
    return Response.json(
      { ok: false, error: { code: "VALIDATION_FAILED", message: "At most 100 paths per call." } },
      { status: 400 },
    );
  }

  const revalidated: string[] = [];
  for (const path of paths) {
    // Only our own routes, and no query strings — this must not become a
    // general-purpose cache primitive driven by whatever is posted.
    if (!path.startsWith("/") || path.includes("?") || path.includes("..")) continue;
    revalidatePath(path);
    revalidated.push(path);
  }

  return Response.json({ ok: true, data: { revalidated } });
}
