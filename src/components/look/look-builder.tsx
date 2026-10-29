'use client';
import { useRef, useState, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { useCart, useCartContext } from '@/components/cart/cart-context';
import { LookSlot } from '@/components/look/look-slot';
import { Button } from '@/components/ui/button';
import type { Locale, Look, Product } from '@/data/schema';
import { SLOTS } from '@/data/taxonomy';
import { createLookSelection, priceLook, toCartLines, validateSelection } from '@/lib/look';
import { formatMoney, type Currency } from '@/lib/money';

export function LookBuilder({
  look,
  products,
  locale,
  currency,
}: {
  look: Look;
  products: Product[];
  locale: Locale;
  currency: Currency;
}): ReactElement {
  const t = useTranslations('look');
  const [selection, setSelection] = useState(() => createLookSelection(look, products));
  const [failed, setFailed] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const hydrated = useCart((s) => s.hydrated);
  const lines = useCart((s) => s.lines);
  const availableProducts = products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => ({
      ...variant,
      stock: Math.max(
        0,
        Math.min(variant.stock, 10) -
          lines.filter((line) => line.sku === variant.sku).reduce((sum, line) => sum + line.qty, 0),
      ),
    })),
  }));
  const { store, openCart } = useCartContext();
  const validity = validateSelection(look, selection, availableProducts);
  const price = priceLook(selection, look.discountPct, products, currency);
  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="grid gap-6 md:grid-cols-2">
        {SLOTS.map((slot) => (
          <LookSlot
            key={slot}
            slot={slot}
            look={look}
            choice={selection[slot]}
            products={availableProducts}
            locale={locale}
            error={!validity.ok && validity.errors.some((e) => e.slot === slot)}
            onChange={(choice) => {
              setFailed(false);
              setSelection({ ...selection, [slot]: choice });
            }}
          />
        ))}
      </div>
      <aside
        className="h-fit space-y-4 rounded-md bg-surface p-6 lg:sticky lg:top-24"
        aria-label={t('summary')}
      >
        <h2 className="text-h2">{t('summary')}</h2>
        <dl className="space-y-3">
          <div className="flex justify-between gap-3">
            <dt>{t('listTotal')}</dt>
            <dd>{formatMoney(price.subtotalCents, currency, locale)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>{t('discount', { percent: look.discountPct })}</dt>
            <dd>{formatMoney(price.discountCents, currency, locale)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-h3">
            <dt>{t('total')}</dt>
            <dd data-testid="look-total">{formatMoney(price.totalCents, currency, locale)}</dd>
          </div>
        </dl>
        <p>{t('saved', { amount: formatMoney(price.discountCents, currency, locale) })}</p>
        <Button
          fullWidth
          disabled={!hydrated}
          onClick={(event) => {
            if (
              !validity.ok ||
              !store.getState().addMany(toCartLines(selection, look.id, products))
            ) {
              setFailed(true);
              requestAnimationFrame(() => errorRef.current?.focus());
              return;
            }
            setFailed(false);
            openCart(event.currentTarget);
          }}
        >
          {t('add')}
        </Button>
        {failed ? (
          <p ref={errorRef} tabIndex={-1} role="alert" className="text-danger">
            {t(validity.ok ? 'cartFull' : 'atomicError')}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
