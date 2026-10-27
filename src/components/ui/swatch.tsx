import type { ReactElement } from 'react';

type SwatchProps = {
  /** CSS colour from catalogue data. This is the only inline style allowed by RULES 5.1. */
  color: string;
  /** Colour name for assistive technology. Omit when the name is already visible next to it. */
  label?: string;
};

/** 16px colour dot with a 1px --color-field ring so light colours stay visible (DESIGN 2.1). */
export function Swatch({ color, label }: SwatchProps): ReactElement {
  const a11y =
    label === undefined
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'img', 'aria-label': label } as const);

  return (
    <span
      {...a11y}
      className="inline-block size-4 shrink-0 rounded-full border border-field"
      style={{ backgroundColor: color }}
    />
  );
}
