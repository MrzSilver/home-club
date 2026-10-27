import type { ComponentPropsWithoutRef, ReactElement, ReactNode, Ref } from 'react';

type IconButtonProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'aria-label' | 'children' | 'type'
> & {
  /** Accessible name; an icon alone says nothing to assistive technology (RULES 8.4). */
  label: string;
  /** The icon. Decorative: the button carries the name. */
  children: ReactNode;
  /** Unavailable, but still focusable so it can explain itself (DESIGN 5.1). Inert: no click handler. */
  disabled?: boolean;
  /** Id of the element that says why the button is unavailable (`aria-describedby` while disabled). */
  disabledReasonId?: string;
  ref?: Ref<HTMLButtonElement>;
};

/**
 * 44 x 44 px icon-only button (RULES 8.3). Colour comes from the parent (`currentColor`), so it works on
 * the canvas and over photography alike. Like `Button`, `disabled` keeps the button in the tab order
 * with `aria-disabled` instead of removing it.
 */
export function IconButton({
  label,
  children,
  disabled = false,
  disabledReasonId,
  className,
  onClick,
  ref,
  ...rest
}: IconButtonProps): ReactElement {
  const describedBy =
    [rest['aria-describedby'], disabled ? disabledReasonId : undefined].filter(Boolean).join(' ') ||
    undefined;

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      aria-label={label}
      aria-disabled={disabled ? true : undefined}
      aria-describedby={describedBy}
      onClick={disabled ? undefined : onClick}
      className={[
        'relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-current',
        'transition-opacity duration-base ease-standard aria-disabled:cursor-not-allowed',
        disabled ? 'opacity-40' : 'hover:opacity-70',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
