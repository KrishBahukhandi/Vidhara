import { SkeletonLine, SkeletonScreen } from "@/components/skeleton";
import { PageShell } from "@/components/site-chrome";

/** Shown while an act's section list is fetched — the IPC's runs to 574 rows. */
export default function LoadingAct() {
  return (
    <PageShell>
      <SkeletonScreen label="Loading this act">
        <SkeletonLine className="h-8 w-2/3" />
        <SkeletonLine className="mt-4 w-full" />
        <SkeletonLine className="mt-2 w-1/2" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="rounded-md border border-border p-4">
              <SkeletonLine className="w-16" />
              <SkeletonLine className="mt-3 w-3/4" />
            </div>
          ))}
        </div>
      </SkeletonScreen>
    </PageShell>
  );
}
