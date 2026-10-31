'use client';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import { useCart, useCartContext, type CartProduct } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import type { CartLine as Line, Variant } from '@/data/schema';
import { Link } from '@/i18n/navigation';
import { availableQtyForLine } from '@/lib/cart';
import { convertFromUsdCents, formatMoney, type Currency } from '@/lib/money';

export function CartLine({
  line,
  product,
  variant,
  currency,
  onNavigate,
}: {
  line: Line;
  product: CartProduct;
  variant: Variant;
  currency: Currency;
  onNavigate?: (() => void) | undefined;
}): ReactElement {
  const t = useTranslations('cart');
  const { locale, looks = [] } = useCartContext();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { sku, qty, lookId } = line;
  const color = product.colors.find((c) => c.id === variant.colorId);
  const image = product.images.find((i) => i.colorId === variant.colorId);
  const maxQty = availableQtyForLine(lines, sku, { [sku]: variant.stock }, lookId);
  return (
    <li className="flex gap-4 py-6">
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
        {lookId ? (
          <p className="text-small">
            {t('lookGroup', {
              name: looks.find((look) => look.id === lookId)?.name[locale] ?? t('look'),
            })}
          </p>
        ) : null}
        <label className="flex flex-wrap items-center gap-3">
          <span className="text-small">{t('quantityFor', { name: product.name[locale] })}</span>
          <select
            value={qty}
            onChange={(e) => setQty(sku, Number(e.target.value), lookId)}
            className="min-h-11 rounded-sm border border-field bg-canvas px-3"
          >
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((value) => (
              <option key={value} value={value}>
                {new Intl.NumberFormat(locale).format(value)}
              </option>
            ))}
          </select>
        </label>
        <p>
          {formatMoney(convertFromUsdCents(product.priceCents, currency) * qty, currency, locale)}
        </p>
        <Button
          variant="link"
          size="sm"
          onClick={() => remove(sku, lookId)}
          aria-label={t('removeFor', { name: product.name[locale] })}
        >
          {t('remove')}
        </Button>
      </div>
    </li>
  );
}
