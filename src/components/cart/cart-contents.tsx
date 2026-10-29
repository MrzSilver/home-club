'use client';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import { useCart, useCartContext } from '@/components/cart/cart-context';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { segmentToCurrency } from '@/lib/currency';
import { convertFromUsdCents, formatMoney } from '@/lib/money';
import { CartLine } from '@/components/cart/cart-line';
import { priceLookCart } from '@/lib/look-cart';
import { cartLineKey } from '@/lib/cart';

export function CartContents({ onNavigate }: { onNavigate?: () => void }): ReactElement {
  const t = useTranslations('cart');
  const { products, locale, looks = [] } = useCartContext();
  const params = useParams();
  const currency = segmentToCurrency(String(params.currency)) ?? (locale === 'th' ? 'THB' : 'USD');
  const lines = useCart((state) => state.lines);
  const hydrated = useCart((state) => state.hydrated);
  const rows = lines.flatMap((line) => {
    const product = products.find((item) =>
      item.variants.some((variant) => variant.sku === line.sku),
    );
    const variant = product?.variants.find((item) => item.sku === line.sku);
    if (product === undefined || variant === undefined) return [];
    return [{ ...line, product, variant, unit: convertFromUsdCents(product.priceCents, currency) }];
  });
  const totals = priceLookCart(lines, products, looks, currency);
  if (!hydrated) return <p role="status">{t('loading')}</p>;
  if (rows.length === 0)
    return (
      <div className="space-y-4 py-8">
        <p role="status">{t('empty')}</p>
        <Link href="/shop" onClick={onNavigate} className={buttonClasses()}>
          {t('continue')}
        </Link>
      </div>
    );
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="text-small text-muted">
        {t('count', { count: rows.reduce((sum, row) => sum + row.qty, 0) })}
      </p>
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <CartLine
            key={cartLineKey(row)}
            line={row}
            product={row.product}
            variant={row.variant}
            currency={currency}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
      <div className="sticky bottom-0 space-y-4 border-t border-line bg-canvas py-4">
        <p className="flex justify-between gap-4 text-h3">
          <span>{t('subtotal')}</span>
          <span data-testid="cart-subtotal" data-currency={currency}>
            {formatMoney(totals.subtotalCents, currency, locale)}
          </span>
        </p>
        {totals.groups.map((group) => (
          <p key={group.lookId} role="status" className="text-small">
            {group.complete
              ? t('lookDiscount', {
                  name: looks.find((look) => look.id === group.lookId)?.name[locale] ?? t('look'),
                  amount: formatMoney(group.discountCents, currency, locale),
                })
              : t('lookIncomplete')}
          </p>
        ))}
        <p className="flex justify-between gap-4 text-h3">
          <span>{t('total')}</span>
          <span data-testid="cart-total">{formatMoney(totals.totalCents, currency, locale)}</span>
        </p>
        <p className="text-small text-muted">{t('demo')}</p>
        {onNavigate ? (
          <Link href="/cart" onClick={onNavigate} className={buttonClasses({ fullWidth: true })}>
            {t('view')}
          </Link>
        ) : (
          <Link href="/checkout" className={buttonClasses({ fullWidth: true })}>
            {t('checkout')}
          </Link>
        )}
      </div>
    </div>
  );
}
