'use client';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import { useCart, useCartContext } from '@/components/cart/cart-context';
import { IconButton } from '@/components/ui/icon-button';
import { BagIcon } from '@/components/ui/icons/bag-icon';

export function CartTrigger(): ReactElement {
  const t = useTranslations('cart');
  const { openCart, locale } = useCartContext();
  const count = useCart((state) =>
    state.hydrated ? state.lines.reduce((sum, line) => sum + line.qty, 0) : 0,
  );
  return (
    <IconButton
      label={count > 0 ? t('count', { count }) : t('title')}
      onClick={(event) => openCart(event.currentTarget)}
    >
      <BagIcon className="size-6" />
      <span
        aria-hidden="true"
        data-slot="cart-badge"
        className={`pointer-events-none absolute end-0 top-0 flex size-4 items-center justify-center rounded-full text-eyebrow ${count > 0 ? 'bg-ink text-canvas' : ''}`}
      >
        {count > 0 ? new Intl.NumberFormat(locale).format(count) : null}
      </span>
    </IconButton>
  );
}
