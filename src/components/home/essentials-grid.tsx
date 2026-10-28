import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { prefetchFor } from '@/components/catalogue/prefetch';
import { ProductCard } from '@/components/catalogue/product-card';
import { buttonClasses } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ArrowRightIcon } from '@/components/ui/icons/arrow-right-icon';
import type { Locale } from '@/data/schema';
import { Link } from '@/i18n/navigation';
import { getFeaturedEssentials } from '@/lib/catalogue';
import type { Currency } from '@/lib/money';

type EssentialsGridProps = { locale: Locale; currency: Currency };

/** "Essentials" (FR-012): four featured products, 2-up on phones and 4-up from tablet width. */
export async function EssentialsGrid({
  locale,
  currency,
}: EssentialsGridProps): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <section aria-labelledby="essentials-heading">
      <Container>
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="essentials-heading" className="text-h2 uppercase-latin">
            {t('essentials.title')}
          </h2>
          <Link
            href="/shop"
            prefetch={prefetchFor('shop')}
            className={buttonClasses({ variant: 'link', size: 'sm', className: 'gap-1' })}
          >
            {t('essentials.seeAll')}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
          {getFeaturedEssentials().map((product) => (
            <li key={product.id}>
              <ProductCard product={product} locale={locale} currency={currency} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
