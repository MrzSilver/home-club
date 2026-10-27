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
 * rule would otherwise strip both (DESIGN 3, RULES 6.5). Colour comes from the parent. Each line gives
 * back its trailing letter-spacing (`wordmark-line*` in globals.css) so the lockup is optically centred.
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
      <span className="wordmark-line">{name}</span>
      {descriptor === undefined ? null : (
        <>
          {/* Invisible in a flex column, but it keeps the text content "Home Club Foundation" for
              accessible names and WCAG 2.5.3 label-in-name checks. */}{' '}
          <span className="text-wordmark-sub wordmark-line-sub text-current">{descriptor}</span>
        </>
      )}
    </span>
  );
}
