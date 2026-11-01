'use client';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import { InfoIcon } from '@/components/ui/icons/info-icon';
import type { CartRecovery } from '@/store/cart';

const FOCUSABLE = 'a[href], button:not([disabled]), select:not([disabled])';

/**
 * Transient notice that the saved cart was cleared or adjusted on load (SPEC 7.1, 13a). The
 * parent renders it only after hydration. Dismissing removes the node that holds focus, so focus
 * moves to the first control left in the cart rather than dropping to `body`.
 */
export function CartRecoveryNotice({
  recovery,
  onDismiss,
  container,
}: {
  recovery: CartRecovery;
  onDismiss: () => void;
  container: { current: HTMLElement | null };
}): ReactElement {
  const t = useTranslations('cart.recovery');
  return (
    <div className="flex items-start gap-3 rounded-md bg-surface px-4 py-3 text-small text-ink">
      <InfoIcon className="mt-0.5 size-5 shrink-0" />
      <p role="status" className="flex-1">
        {t(recovery)}
      </p>
      <button
        type="button"
        onClick={() => {
          onDismiss();
          requestAnimationFrame(() =>
            container.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(),
          );
        }}
        className="-my-2 -me-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md px-3 underline"
      >
        {t('dismiss')}
      </button>
    </div>
  );
}
