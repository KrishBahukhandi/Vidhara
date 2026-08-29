/**
 * Placeholder shapes for a route that is still loading.
 *
 * These exist because a section page is rendered on demand — `generateStaticParams`
 * returns `[]` for the 5,594 of them (D-017) — so a tap on a search result or a
 * prev/next chip has a real wait behind it, and until now that wait showed the
 * previous page, motionless, with no sign anything had happened. On a phone that
 * reads as a dropped tap, and the reflex is to tap again.
 *
 * They are shaped like the page they stand in for, not like a spinner: the
 * breadcrumb, the heading, the body. That way the layout does not jump when the
 * real content lands, and the eye is already where the text will be.
 *
 * Deliberately still. A shimmer would animate the layout of reading text, which
 * design.md §7 rules out, and it draws attention to the wait instead of away
 * from it. Under `prefers-reduced-motion` the pulse stops entirely.
 */
export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`h-4 rounded bg-border ${className}`} aria-hidden />;
}

/** A block of body text: several lines, the last one short, as prose ends. */
export function SkeletonParagraph({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} className={i === lines - 1 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

/**
 * Wraps a skeleton so screen readers announce the wait rather than reading out
 * a page of empty boxes.
 */
export function SkeletonScreen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="motion-safe:animate-pulse">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
