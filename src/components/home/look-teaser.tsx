import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';
import { Container } from '@/components/ui/container';
import { buttonClasses } from '@/components/ui/button';
import { LOOKS } from '@/data/looks';
import { PRODUCTS } from '@/data/products';
import type { Locale } from '@/data/schema';
import { Link } from '@/i18n/navigation';
import { createLookSelection, priceLook } from '@/lib/look';
import { formatMoney, type Currency } from '@/lib/money';

export async function LookTeaser({
  locale,
  currency,
}: {
  locale: Locale;
  currency: Currency;
}): Promise<ReactElement | null> {
  const look = LOOKS[0];
  if (!look) return null;
  const t = await getTranslations({ locale, namespace: 'look' });
  const price = priceLook(
    createLookSelection(look, PRODUCTS),
    look.discountPct,
    PRODUCTS,
    currency,
  );
  return (
    <section aria-labelledby="look-teaser-heading">
      <Container>
        <div className="grid gap-8 rounded-md bg-surface p-6 md:grid-cols-2 md:p-8">
          <div className="flex flex-col justify-center gap-4">
            <h2 id="look-teaser-heading" className="text-h2">
              {t('build')}
            </h2>
            <p>{look.description[locale]}</p>
            <p className="text-h3">{formatMoney(price.totalCents, currency, locale)}</p>
            <Link href={`/looks/${look.slug}`} prefetch={false} className={buttonClasses()}>
              {t('build')}
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-4">
            {Object.values(look.slots).map((slot) => {
              const product = PRODUCTS.find((p) => p.id === slot.defaultProductId);
              const image = product?.images[0];
              return product && image ? (
                <li key={product.id}>
                  <Image
                    src={`${image.src}?v=angles-20261029`}
                    alt={image.alt[locale]}
                    width={image.width}
                    height={image.height}
                    sizes="(min-width: 768px) 22vw, 40vw"
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <p className="mt-2 text-small">{product.name[locale]}</p>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}
