import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CategoryTile } from '@/components/home/category-tile';
import { Container } from '@/components/ui/container';
import type { Locale } from '@/data/schema';
import { getAllCategories } from '@/lib/catalogue';

type CategoryTilesProps = { locale: Locale };

/**
 * The four category tiles (FR-011). Phones scroll them sideways with snap points, so each tile keeps
 * the 16:9 shape and room for Thai copy and the next one peeks in; two per row at md, four at lg.
 * The row is plain links in DOM order, so keyboard focus scrolls to a tile by itself.
 */
export async function CategoryTiles({ locale }: CategoryTilesProps): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <section aria-labelledby="categories-heading">
      <h2 id="categories-heading" className="sr-only">
        {t('categories.heading')}
      </h2>
      <Container>
        <ul className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter pb-1 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4">
          {getAllCategories().map((category) => (
            <li key={category.id} className="w-[72vw] shrink-0 snap-start md:w-auto">
              <CategoryTile category={category} locale={locale} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
