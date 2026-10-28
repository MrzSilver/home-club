'use client';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent, type ReactElement } from 'react';
import { useCart, useCartContext } from '@/components/cart/cart-context';
import { Gallery } from '@/components/product/gallery';
import { Button } from '@/components/ui/button';
import type { Locale, Product, Size } from '@/data/schema';
import { convertFromUsdCents, formatMoney, type Currency } from '@/lib/money';
import {
  availableColorsFor,
  availableSizesFor,
  defaultColorFor,
  isLowStock,
  isSoldOut,
  maxQtyFor,
} from '@/lib/stock';

export function ProductDetails({
  product,
  locale,
  currency,
}: {
  product: Product;
  locale: Locale;
  currency: Currency;
}): ReactElement {
  const t = useTranslations('product');
  const id = useId();
  const [colorId, setColorId] = useState(defaultColorFor(product));
  const [size, setSize] = useState<Size | null>(null);
  const [requestedQty, setQty] = useState(1);
  const hydrated = useCart((state) => state.hydrated);
  const add = useCart((state) => state.add);
  const { openCart } = useCartContext();
  const variant = product.variants.find((item) => item.colorId === colorId && item.size === size);
  const max = maxQtyFor(variant);
  const qty = Math.min(requestedQty, max || 1);
  const colors = availableColorsFor(product, size);
  const sizes = availableSizesFor(product, colorId ?? '');
  const images = product.images.filter((image) => image.colorId === colorId);
  const ready = hydrated && max > 0;
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (ready && variant && add(variant.sku, qty))
      openCart(event.currentTarget.querySelector('button[type="submit"]'));
  };
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <Gallery key={colorId} images={images} locale={locale} />
      <div className="space-y-6">
        <h1 className="text-h1">{product.name[locale]}</h1>
        <p className="text-h3" data-testid="product-price" data-currency={currency}>
          {formatMoney(convertFromUsdCents(product.priceCents, currency), currency, locale)}
        </p>
        <p className="text-muted">{product.description[locale]}</p>
        <form onSubmit={submit} className="space-y-6">
          <fieldset>
            <legend className="mb-3 text-eyebrow uppercase-latin">{t('color')}</legend>
            <div className="flex flex-wrap gap-3">
              {colors.map((option) => {
                const color = product.colors.find((item) => item.id === option.value);
                return (
                  <label
                    key={option.value}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-3 ${colorId === option.value ? 'border-ink bg-surface' : 'border-field'} ${option.available ? '' : 'opacity-40'}`}
                  >
                    <input
                      type="radio"
                      name={`${id}-color`}
                      value={option.value}
                      checked={colorId === option.value}
                      disabled={!option.available}
                      aria-disabled={!option.available}
                      onChange={() => {
                        if (option.available) {
                          setColorId(option.value);
                          setQty(1);
                        }
                      }}
                    />
                    <span>
                      {color?.name[locale]}
                      {option.available ? '' : ` (${t('unavailable')})`}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 text-eyebrow uppercase-latin">{t('size')}</legend>
            <div className="flex flex-wrap gap-3">
              {sizes.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-3 ${size === option.value ? 'border-ink bg-surface' : 'border-field'} ${option.available ? '' : 'opacity-40'}`}
                >
                  <input
                    type="radio"
                    name={`${id}-size`}
                    value={option.value}
                    checked={size === option.value}
                    disabled={!option.available}
                    aria-disabled={!option.available}
                    onChange={() => {
                      if (option.available) {
                        setSize(option.value);
                        setQty(1);
                      }
                    }}
                  />
                  <span>
                    {option.value === 'ONE' ? t('oneSize') : option.value}
                    {option.available ? '' : ` (${t('unavailable')})`}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p id={`${id}-stock`} role="status" className="min-h-6 text-small">
            {isSoldOut(product)
              ? t('soldOut')
              : variant === undefined
                ? t('choose')
                : max === 0
                  ? t('soldOut')
                  : isLowStock(variant)
                    ? t('lowStock', { count: variant.stock })
                    : t('inStock')}
          </p>
          <label className="flex items-center gap-4">
            <span>{t('quantity')}</span>
            <select
              aria-describedby={`${id}-stock`}
              disabled={!ready}
              value={qty}
              onChange={(event) => setQty(Number(event.target.value))}
              className="min-h-11 rounded-sm border border-field bg-canvas px-4"
            >
              {Array.from({ length: max || 1 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {new Intl.NumberFormat(locale).format(value)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" fullWidth disabled={!ready} disabledReasonId={`${id}-stock`}>
            {t('add')}
          </Button>
        </form>
      </div>
    </div>
  );
}
