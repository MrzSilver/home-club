import type { ReactElement } from 'react';

type WordmarkProps = {
  /** Brand name, rendered uppercase. */
  name: string;
  /** Optional sub-line under the name (the "Foundation" line of the lockup). */
  descriptor?: string;
  align?: 'center' | 'start';
  className?: string;
};

/**
 * Lockup of the brand name and an optional sub-line. The brand is Latin in both locales, so the
 * element declares lang="en": it stays uppercase and tracked on Thai pages, where the global Thai
 * rule would otherwise strip both (DESIGN 3, RULES 6.5). Colour comes from the parent.
 */
export function Wordmark({
  name,
  descriptor,
  align = 'center',
  className,
}: WordmarkProps): ReactElement {
  return (
    <span
      lang="en"
      className={[
        'inline-flex flex-col gap-1 whitespace-nowrap text-wordmark uppercase',
        align === 'center' ? 'items-center' : 'items-start',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span>{name}</span>
      {descriptor === undefined ? null : (
        <span className="text-wordmark-sub text-current">{descriptor}</span>
      )}
    </span>
  );
}
