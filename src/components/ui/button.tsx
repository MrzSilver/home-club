import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { ArrowRightIcon } from './icons/arrow-right-icon';

export type ButtonVariant = 'primary' | 'secondary' | 'on-image' | 'link';
export type ButtonSize = 'md' | 'sm';

type ButtonLook = {
  variant?: ButtonVariant | undefined;
  /** `md` is 48px high, `sm` is 44px, the minimum touch target (DESIGN 5.1, RULES 8.3). */
  size?: ButtonSize | undefined;
  fullWidth?: boolean | undefined;
};

const BASE =
  'group inline-flex items-center justify-center gap-2 text-button uppercase-latin ' +
  'transition-colors duration-base ease-standard aria-disabled:cursor-not-allowed';

// Shape and tone per variant. Hover shifts tone by <= 8% (DESIGN 5.1); nothing scales or jumps.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'rounded-md bg-ink px-6 text-canvas not-aria-disabled:hover:bg-ink/92',
  secondary:
    'rounded-md border border-ink bg-canvas px-6 text-ink not-aria-disabled:hover:bg-surface',
  'on-image': 'rounded-md bg-canvas px-6 text-ink not-aria-disabled:hover:bg-surface',
  link: 'px-1 text-ink underline decoration-1 underline-offset-4 not-aria-disabled:hover:decoration-2',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-12',
  sm: 'min-h-11',
};

/**
 * Class string for the button look, so a link can wear it too:
 * `<Link href="/shop" className={buttonClasses({ variant: 'primary' })}>`.
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: ButtonLook & { className?: string | undefined } = {}): string {
  return [BASE, VARIANTS[variant], SIZES[size], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ');
}

export type ButtonProps = ComponentPropsWithoutRef<'button'> &
  ButtonLook & {
    /** Trailing line arrow (DESIGN 5.1). */
    withArrow?: boolean;
    /** Id of the element that explains why the button is unavailable; linked with aria-describedby. */
    disabledReasonId?: string;
  };

/**
 * `disabled` never sets the native attribute: the button stays in the tab order with `aria-disabled`
 * and 40% opacity so it can explain itself (DESIGN 5.1). It is inert instead: the click handler is
 * dropped and it never submits a form.
 */
export function Button({
  variant,
  size,
  fullWidth,
  className,
  withArrow = false,
  disabled = false,
  disabledReasonId,
  type = 'button',
  onClick,
  children,
  ...rest
}: ButtonProps): ReactElement {
  // The caller's own description stays; the reason is appended while the button is disabled.
  const describedBy =
    [rest['aria-describedby'], disabled ? disabledReasonId : undefined].filter(Boolean).join(' ') ||
    undefined;

  return (
    <button
      {...rest}
      type={disabled ? 'button' : type}
      aria-disabled={disabled ? true : undefined}
      aria-describedby={describedBy}
      onClick={disabled ? undefined : onClick}
      className={buttonClasses({
        variant,
        size,
        fullWidth,
        className: [disabled ? 'opacity-40' : '', className].filter(Boolean).join(' '),
      })}
    >
      {children}
      {withArrow ? (
        <ArrowRightIcon
          className={[
            'size-4 transition-transform duration-base ease-standard',
            disabled ? '' : 'motion-safe:group-hover:translate-x-1',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ) : null}
    </button>
  );
}
