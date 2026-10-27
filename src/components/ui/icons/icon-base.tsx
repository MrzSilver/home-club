import type { ReactElement, ReactNode, SVGProps } from 'react';

// `aria-label`, `aria-hidden` and `role` are omitted so that `label` is the only way to name an icon:
// a raw aria-label would otherwise be combined with the aria-hidden of a "decorative" icon.
export type IconProps = Omit<
  SVGProps<SVGSVGElement>,
  'children' | 'viewBox' | 'xmlns' | 'aria-label' | 'aria-hidden' | 'role'
> & {
  /** Accessible name. Omit for decorative icons, which are hidden from assistive technology. */
  label?: string;
};

type IconBaseProps = IconProps & { children: ReactNode };

/**
 * Shared frame for the line icons: 24 grid, 1.5 stroke, `currentColor`. Size it with a `size-*`
 * class; the width and height attributes are only the no-CSS default.
 */
export function IconBase({ label, children, ...rest }: IconBaseProps): ReactElement {
  const a11y =
    label === undefined
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'img', 'aria-label': label } as const);

  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...rest}
      {...a11y}
    >
      {children}
    </svg>
  );
}
