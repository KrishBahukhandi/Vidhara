import { SkeletonLine, SkeletonScreen } from "@/components/skeleton";
import { PageShell } from "@/components/site-chrome";

/** Shown while a search runs — the one place a reader is certain to be waiting. */
export default function LoadingSearch() {
  return (
    <PageShell>
      <SkeletonScreen label="Searching">
        <SkeletonLine className="h-8 w-1/2" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-md border border-border p-4">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="mt-3 w-full" />
              <SkeletonLine className="mt-2 w-5/6" />
            </div>
          ))}
        </div>
      </SkeletonScreen>
    </PageShell>
  );
}
