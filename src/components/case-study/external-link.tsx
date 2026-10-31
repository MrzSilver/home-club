import type { ReactElement, ReactNode } from 'react';

type ExternalLinkProps = {
  href: string;
  /** Spoken after the label, e.g. "opens in a new tab". */
  newTabLabel: string;
  children: ReactNode;
};

/** Plain anchor to another site: new tab, no opener, and the new tab announced to assistive tech. */
export function ExternalLink({ href, newTabLabel, children }: ExternalLinkProps): ReactElement {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center break-all underline underline-offset-4 hover:decoration-2"
    >
      {children} <span className="sr-only">{newTabLabel}</span>
    </a>
  );
}
