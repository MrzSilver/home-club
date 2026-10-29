'use client';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import type { Locale, Look, Product, Slot } from '@/data/schema';
import type { LookChoice } from '@/lib/look';

export function LookSlot({
  slot,
  look,
  choice,
  products,
  locale,
  onChange,
  error,
}: {
  slot: Slot;
  look: Look;
  choice: LookChoice;
  products: readonly Product[];
  locale: Locale;
  onChange: (choice: LookChoice) => void;
  error: boolean;
}): ReactElement {
  const t = useTranslations('look');
  const allowed = products.filter(
    (p) => p.slot === slot && look.slots[slot].allowedProductIds.includes(p.id),
  );
  const product = allowed.find((p) => p.id === choice.productId);
  const image = product?.images.find(
    (i) => i.colorId === choice.colorId && i.view !== 'back' && i.view !== 'side',
  );
  const changeProduct = (id: string): void => {
    const next = allowed.find((p) => p.id === id);
    const variant = next?.variants.find((v) => v.stock > 0) ?? next?.variants[0];
    onChange({ productId: id, colorId: variant?.colorId ?? '', size: variant?.size ?? '' });
  };
  const control = 'min-h-11 w-full rounded-sm border border-field bg-canvas px-3';
  return (
    <fieldset
      className={`min-w-0 space-y-4 rounded-md border p-6 ${error ? 'border-danger' : 'border-line'}`}
    >
      <legend className="px-2 text-h3">{t(`slots.${slot}`)}</legend>
      {image ? (
        <Image
          src={`${image.src}?v=angles-20261029`}
          alt={image.alt[locale]}
          width={image.width}
          height={image.height}
          sizes="(min-width: 768px) 30vw, 80vw"
          loading={slot === 'top' ? 'eager' : undefined}
          fetchPriority={slot === 'top' ? 'high' : undefined}
          className="aspect-square w-full rounded-md bg-surface object-cover"
        />
      ) : null}
      <label className="block space-y-2">
        <span>{t('product')}</span>
        <select
          className={control}
          aria-invalid={error || undefined}
          aria-describedby={`look-${slot}-status`}
          value={choice.productId}
          onChange={(e) => changeProduct(e.target.value)}
        >
          {allowed.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name[locale]}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span>{t('color')}</span>
        <select
          className={control}
          aria-invalid={error || undefined}
          aria-describedby={`look-${slot}-status`}
          value={choice.colorId}
          onChange={(e) => onChange({ ...choice, colorId: e.target.value })}
        >
          {product?.colors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name[locale]}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span>{t('size')}</span>
        <select
          className={control}
          aria-invalid={error || undefined}
          aria-describedby={`look-${slot}-status`}
          value={choice.size}
          onChange={(e) => onChange({ ...choice, size: e.target.value })}
        >
          {[...new Set(product?.variants.map((v) => v.size))].map((size) => (
            <option key={size} value={size}>
              {size === 'ONE' ? t('oneSize') : size}
            </option>
          ))}
        </select>
      </label>
      <p id={`look-${slot}-status`} role="status" className={error ? 'text-danger' : 'text-muted'}>
        {t(error ? 'unavailable' : 'available')}
      </p>
      {error ? (
        <div className="space-y-2">
          <p>{t('alternatives')}</p>
          {allowed.flatMap((p) => {
            const variant = p.variants.find((v) => v.stock > 0);
            return variant
              ? [
                  <button
                    key={p.id}
                    type="button"
                    className="min-h-11 rounded-sm border border-field px-3 text-small"
                    onClick={() =>
                      onChange({ productId: p.id, colorId: variant.colorId, size: variant.size })
                    }
                  >
                    {p.name[locale]} · {variant.size}
                  </button>,
                ]
              : [];
          })}
        </div>
      ) : null}
    </fieldset>
  );
}
