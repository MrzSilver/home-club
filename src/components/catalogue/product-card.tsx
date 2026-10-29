import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { ProductCardPreview } from '@/components/catalogue/product-card-preview';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import type { Locale, Product } from '@/data/schema';
import { convertFromUsdCents, formatMoney, type Currency } from '@/lib/money';
import { defaultColorFor, isSoldOut } from '@/lib/stock';

// 2-up on phones, 4-up from md (container padding and gaps included): the width a card really gets.
export const PRODUCT_CARD_SIZES = '(min-width: 80rem) 282px, (min-width: 48rem) 25vw, 50vw';

type ProductCardProps = {
  product: Product;
  locale: Locale;
  currency: Currency;
  sizes?: string;
  priority?: boolean;
  prefetch?: boolean;
};

/** Server-rendered price and copy with a small interactive colour preview (FR-022). */
export async function ProductCard({
  product,
  locale,
  currency,
  sizes = PRODUCT_CARD_SIZES,
  priority = false,
  prefetch = false,
}: ProductCardProps): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'catalogue' });
  const colorId = defaultColorFor(product);
  const colorNames = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(
    product.colors.map((color) => color.name[locale]),
  );

  return (
    <ProductCardPreview
      product={{ slug: product.slug, images: product.images, colors: product.colors }}
      locale={locale}
      initialColorId={colorId}
      sizes={sizes}
      priority={priority}
      prefetch={prefetch}
      colorsLabel={t('card.colors', { names: colorNames })}
    >
      <h3 className="mt-3 text-eyebrow uppercase-latin">{product.name[locale]}</h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-small">
        <span data-testid="product-price" data-currency={currency}>
          {formatMoney(convertFromUsdCents(product.priceCents, currency), currency, locale)}
        </span>
        {isSoldOut(product) ? <span className="text-muted">{t('card.soldOut')}</span> : null}
      </p>
      <VisuallyHidden>{t('card.colors', { names: colorNames })}</VisuallyHidden>
    </ProductCardPreview>
  );
}
