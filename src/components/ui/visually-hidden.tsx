import type { ReactElement, ReactNode } from 'react';

/** Text for assistive technology only: removed from view, kept in the accessibility tree. */
export function VisuallyHidden({ children }: { children: ReactNode }): ReactElement {
  return <span className="sr-only">{children}</span>;
}
