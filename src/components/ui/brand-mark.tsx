import type { ReactElement } from 'react';

type BrandMarkProps = {
  className?: string;
  /** Accessible name. Omit when the mark sits next to the wordmark or inside a labelled link. */
  label?: string;
};

/** Home Club monogram: an "H" inside a circle. Original drawing; inherits `currentColor`. */
export function BrandMark({ className, label }: BrandMarkProps): ReactElement {
  const a11y =
    label === undefined
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'img', 'aria-label': label } as const);

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      focusable="false"
      className={['size-10 shrink-0', className].filter(Boolean).join(' ')}
      {...a11y}
    >
      <circle cx="24" cy="24" r="22" />
      <path d="M17 14v20M31 14v20M17 24h14" />
    </svg>
  );
}
