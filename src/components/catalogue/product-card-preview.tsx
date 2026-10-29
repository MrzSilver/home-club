'use client';

import Image from 'next/image';
import { useState, type ReactElement, type ReactNode } from 'react';

import { Swatch } from '@/components/ui/swatch';
import type { Locale, Product } from '@/data/schema';
import { Link } from '@/i18n/navigation';

type ProductCardPreviewProps = {
  product: Pick<Product, 'slug' | 'images' | 'colors'>;
  locale: Locale;
  initialColorId: string | undefined;
  sizes: string;
  priority: boolean;
  prefetch: boolean;
  colorsLabel: string;
  children: ReactNode;
};

/** Keep colour selection local to each card; only the image and product text navigate. */
export function ProductCardPreview({
  product,
  locale,
  initialColorId,
  sizes,
  priority,
  prefetch,
  colorsLabel,
  children,
}: ProductCardPreviewProps): ReactElement {
  const [colorId, setColorId] = useState(initialColorId);
  const shots = product.images.filter((image) => image.colorId === colorId);
  const primary = shots.find((image) => image.view === 'front') ?? shots[0] ?? product.images[0];
  const alternate = shots.find((image) => image.view === 'back') ?? shots[1];
  const imageClass = 'absolute inset-0 size-full object-cover object-top';

  return (
    <article data-product-card={product.slug}>
      <Link
        href={`/products/${product.slug}`}
        prefetch={prefetch}
        className="group block rounded-md"
      >
        <div className="relative aspect-card overflow-hidden rounded-md bg-surface">
          {primary === undefined ? null : (
            <Image
              src={`${primary.src}?v=angles-20261029`}
              alt=""
              width={primary.width}
              height={primary.height}
              sizes={sizes}
              preload={priority}
              className={imageClass}
            />
          )}
          {alternate === undefined ? null : (
            <Image
              src={`${alternate.src}?v=angles-20261029`}
              alt=""
              width={alternate.width}
              height={alternate.height}
              sizes={sizes}
              // The hidden hover view must not compete with the visible LCP photograph.
              fetchPriority="low"
              className={`${imageClass} opacity-0 transition-opacity duration-slow ease-standard group-hover:opacity-100 motion-reduce:transition-none`}
            />
          )}
        </div>
        {children}
      </Link>
      <div role="group" aria-label={colorsLabel} className="mt-1 flex flex-wrap items-center">
        {product.colors.map((color) => (
          <button
            key={color.id}
            type="button"
            aria-label={color.name[locale]}
            aria-pressed={colorId === color.id}
            title={color.name[locale]}
            onClick={() => setColorId(color.id)}
            className="flex size-11 items-center justify-center rounded-full"
          >
            <span
              className={`flex size-7 items-center justify-center rounded-full border ${colorId === color.id ? 'border-ink' : 'border-transparent'}`}
            >
              <Swatch color={color.hex} />
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}
