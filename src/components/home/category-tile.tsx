import Image from 'next/image';
import type { ReactElement } from 'react';

import { prefetchFor } from '@/components/catalogue/prefetch';
import { ArrowRightIcon } from '@/components/ui/icons/arrow-right-icon';
import type { CategoryEntry, Locale } from '@/data/schema';
import { Link } from '@/i18n/navigation';

// A phone shows a tile and a peek of the next (72vw); md shows two per row, lg four.
const TILE_SIZES =
  '(min-width: 80rem) 296px, (min-width: 64rem) 22vw, (min-width: 48rem) 45vw, 72vw';

type CategoryTileProps = { category: CategoryEntry; locale: Locale };

/**
 * One category tile (FR-011, DESIGN 5.4): the whole tile is a single link. The picture is decorative: the title and
 * subtitle name the link, so a screen reader does not read a photo description first (as ProductCard).
 * The title is uppercase in
 * English only (`uppercase-latin`, Thai keeps its case). The gradient sits under the text and keeps
 * canvas-coloured copy readable on the lightest placeholder (measured in tests/e2e/home-contrast).
 */
export function CategoryTile({ category, locale }: CategoryTileProps): ReactElement {
  const { image } = category;
  return (
    <Link
      href={`/collections/${category.id}`}
      prefetch={prefetchFor('collections')}
      className="group relative block aspect-tile overflow-hidden rounded-md bg-forest text-canvas md:aspect-tile-lg"
      data-on-dark=""
    >
      <Image
        src={image.src}
        alt=""
        width={image.width}
        height={image.height}
        sizes={TILE_SIZES}
        className="absolute inset-0 size-full object-cover transition-transform duration-slow ease-standard motion-safe:group-hover:scale-[1.03]"
      />
      <div aria-hidden="true" className="tile-scrim absolute inset-0" />
      <div className="relative flex h-full flex-col justify-end p-4">
        <h3 className="text-eyebrow uppercase-latin">{category.name[locale]}</h3>
        <p className="mt-0.5 text-small text-canvas/85">{category.subtitle[locale]}</p>
        <ArrowRightIcon className="mt-2 size-5 transition-transform duration-base ease-standard motion-safe:group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
