/**
 * Liveness probe (architecture.md §12). DB/auth reachability checks are added
 * when the Supabase project exists; `minSupportedAppVersion` powers the app's
 * forced-upgrade gate from Phase 3.
 */
export function GET() {
  return Response.json({
    ok: true,
    service: "nexlex-web",
    version: "0.1.0",
    minSupportedAppVersion: "0.1.0",
  });
}
