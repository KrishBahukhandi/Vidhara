import { Fragment } from "react";

/**
 * Web twin of the app's MarkdownLite: paragraphs, **bold**, whole-paragraph
 * *italic* editorial notes. Statute text renders serif at reading size with
 * a capped measure (design.md §3). Deliberately tiny and dependency-free.
 */
export function MarkdownLite({ children }: { children: string }) {
  const paragraphs = children.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <div className="max-w-measure space-y-4">
      {paragraphs.map((paragraph, index) => {
        const trimmed = paragraph.trim();
        const isNote = /^\*[^*].*\*$/s.test(trimmed);
        const content = isNote ? trimmed.slice(1, -1) : trimmed;

        return (
          <p
            key={index}
            className={
              isNote
                ? "font-serif text-body-lg italic text-text-muted"
                : "font-serif text-body-lg text-text"
            }>
            {content.split(/(\*\*[^*]+\*\*)/g).map((segment, i) =>
              segment.startsWith("**") && segment.endsWith("**") ? (
                <strong key={i}>{segment.slice(2, -2)}</strong>
              ) : (
                <Fragment key={i}>{segment}</Fragment>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}
