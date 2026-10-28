import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Swatch } from '@/components/ui/swatch';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import type { Locale, Product } from '@/data/schema';
import { Link } from '@/i18n/navigation';
import { convertFromUsdCents, formatMoney, type Currency } from '@/lib/money';
import { defaultColorFor, isSoldOut } from '@/lib/stock';

// 2-up on phones, 4-up from md (container padding and gaps included): the width a card really gets.
export const PRODUCT_CARD_SIZES = '(min-width: 80rem) 282px, (min-width: 48rem) 25vw, 50vw';

type ProductCardProps = {
  product: Product;
  locale: Locale;
  currency: Currency;
  /** Tells the browser how wide the card is drawn; the default fits the 4-up Home grid. */
  sizes?: string;
  /** Fetch the first picture eagerly: for the one card that can be the page's largest paint. */
  priority?: boolean;
  /** Collection filters reveal cards without fetching unrelated product routes. */
  prefetch?: boolean;
};

/**
 * Product card (SPEC 9, DESIGN 5.5, FR-022). The whole card is ONE link and nothing inside it is
 * interactive: the swatches are decorative (their names are read out as one hidden sentence) and there
 * is no quick-add in P1. Server-rendered, so the price is already in the first HTML in the visitor's
 * currency. Images carry an empty `alt`: the name and price printed under them are the card's text, so
 * a description of the picture would only repeat the link name.
 */
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
  const shots = product.images.filter((image) => image.colorId === colorId);
  const primary = shots[0] ?? product.images[0];
  const alternate = shots[1];
  const colorNames = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(
    product.colors.map((color) => color.name[locale]),
  );
  const imageClass = 'absolute inset-0 size-full object-cover';

  return (
    <Link href={`/products/${product.slug}`} prefetch={prefetch} className="group block rounded-md">
      <div className="relative aspect-card overflow-hidden rounded-md bg-surface">
        {primary === undefined ? null : (
          <Image
            src={primary.src}
            alt=""
            width={primary.width}
            height={primary.height}
            sizes={sizes}
            priority={priority}
            className={imageClass}
          />
        )}
        {alternate === undefined ? null : (
          // Hover shows the second view with CSS alone; it loads lazily like any off-screen image.
          <Image
            src={alternate.src}
            alt=""
            width={alternate.width}
            height={alternate.height}
            sizes={sizes}
            className={`${imageClass} opacity-0 transition-opacity duration-slow ease-standard group-hover:opacity-100 motion-reduce:transition-none`}
          />
        )}
      </div>
      <h3 className="mt-3 text-eyebrow uppercase-latin">{product.name[locale]}</h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-small">
        <span data-testid="product-price" data-currency={currency}>
          {formatMoney(convertFromUsdCents(product.priceCents, currency), currency, locale)}
        </span>
        {isSoldOut(product) ? <span className="text-muted">{t('card.soldOut')}</span> : null}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {product.colors.map((color) => (
          <Swatch key={color.id} color={color.hex} />
        ))}
        <VisuallyHidden>{t('card.colors', { names: colorNames })}</VisuallyHidden>
      </div>
    </Link>
  );
}
