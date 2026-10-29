'use client';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import { useCart, useCartContext } from '@/components/cart/cart-context';
import { Button, buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { segmentToCurrency } from '@/lib/currency';
import { convertFromUsdCents, formatMoney } from '@/lib/money';
import { maxQtyFor } from '@/lib/stock';

export function CartContents({ onNavigate }: { onNavigate?: () => void }): ReactElement {
  const t = useTranslations('cart');
  const { products, locale } = useCartContext();
  const params = useParams();
  const currency = segmentToCurrency(String(params.currency)) ?? (locale === 'th' ? 'THB' : 'USD');
  const lines = useCart((state) => state.lines);
  const hydrated = useCart((state) => state.hydrated);
  const setQty = useCart((state) => state.setQty);
  const remove = useCart((state) => state.remove);
  const rows = lines.flatMap((line) => {
    const product = products.find((item) =>
      item.variants.some((variant) => variant.sku === line.sku),
    );
    const variant = product?.variants.find((item) => item.sku === line.sku);
    if (product === undefined || variant === undefined) return [];
    return [{ ...line, product, variant, unit: convertFromUsdCents(product.priceCents, currency) }];
  });
  const total = rows.reduce((sum, row) => sum + row.unit * row.qty, 0);
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
        {rows.map(({ sku, qty, product, variant, unit }) => {
          const color = product.colors.find((item) => item.id === variant.colorId);
          const image = product.images.find((item) => item.colorId === variant.colorId);
          return (
            <li key={sku} className="flex gap-4 py-6">
              {image ? (
                <Image
                  src={`${image.src}?v=angles-20261029`}
                  alt={image.alt[locale]}
                  width={image.width}
                  height={image.height}
                  sizes="96px"
                  className="size-24 rounded-md bg-surface object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1 space-y-2">
                <Link
                  href={`/products/${product.slug}`}
                  onClick={onNavigate}
                  className="inline-flex min-h-11 items-center text-h3"
                >
                  {product.name[locale]}
                </Link>
                <p className="text-small text-muted">
                  {color?.name[locale]} · {variant.size === 'ONE' ? t('oneSize') : variant.size}
                </p>
                <label className="flex flex-wrap items-center gap-3">
                  <span className="text-small">
                    {t('quantityFor', { name: product.name[locale] })}
                  </span>
                  <select
                    value={qty}
                    onChange={(event) => setQty(sku, Number(event.target.value))}
                    className="min-h-11 rounded-sm border border-field bg-canvas px-3"
                  >
                    {Array.from({ length: maxQtyFor(variant) }, (_, index) => index + 1).map(
                      (value) => (
                        <option key={value} value={value}>
                          {new Intl.NumberFormat(locale).format(value)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <p>{formatMoney(unit * qty, currency, locale)}</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => remove(sku)}
                  aria-label={t('removeFor', { name: product.name[locale] })}
                >
                  {t('remove')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 space-y-4 border-t border-line bg-canvas py-4">
        <p className="flex justify-between gap-4 text-h3">
          <span>{t('subtotal')}</span>
          <span data-testid="cart-subtotal" data-currency={currency}>
            {formatMoney(total, currency, locale)}
          </span>
        </p>
        <p className="text-small text-muted">{t('demo')}</p>
        {onNavigate ? (
          <Link href="/cart" onClick={onNavigate} className={buttonClasses({ fullWidth: true })}>
            {t('view')}
          </Link>
        ) : (
          <Link href="/shop" className={buttonClasses({ fullWidth: true, variant: 'secondary' })}>
            {t('continue')}
          </Link>
        )}
      </div>
    </div>
  );
}
