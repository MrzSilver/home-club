import type { ReactElement } from 'react';

type SkipLinkProps = {
  /** Translated link text; the caller owns the copy (RULES 6.1). */
  label: string;
  /** Id of the element to jump to, without the hash. The page's <main> carries id="main". */
  targetId?: string;
};

/** First focusable element on the page. Parked above the viewport until it receives keyboard focus (opacity and transform only). */
export function SkipLink({ label, targetId = 'main' }: SkipLinkProps): ReactElement {
  return (
    <a
      href={`#${targetId}`}
      className="fixed top-0 left-4 z-50 -translate-y-full rounded-md bg-ink px-4 py-3 text-button text-canvas opacity-0 focus:translate-y-4 focus:opacity-100"
    >
      {label}
    </a>
  );
}
