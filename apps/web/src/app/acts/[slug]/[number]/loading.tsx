import { SkeletonLine, SkeletonParagraph, SkeletonScreen } from "@/components/skeleton";
import { PageShell } from "@/components/site-chrome";

/**
 * Shown while a section page is fetched. These render on demand rather than at
 * build time (D-017), so this is the wait a reader actually meets when they tap
 * a search result or a prev/next chip.
 */
export default function LoadingSection() {
  return (
    <PageShell>
      <SkeletonScreen label="Loading this section">
        <SkeletonLine className="w-48" />
        <div className="mt-6 space-y-3">
          <SkeletonLine className="w-40" />
          <SkeletonLine className="h-7 w-full" />
          <SkeletonLine className="h-7 w-4/5" />
        </div>
        <div className="mt-8">
          <SkeletonParagraph lines={7} />
        </div>
      </SkeletonScreen>
    </PageShell>
  );
}
