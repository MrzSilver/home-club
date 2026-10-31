import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { ProductCard } from '@/components/catalogue/product-card';
import { Container } from '@/components/ui/container';
import { VIBE_ENTRIES } from '@/data/vibes';
import { CATEGORY_ENTRIES } from '@/data/categories';
import { PRODUCTS } from '@/data/products';
import { resolveRouteParams } from '@/i18n/params';
import { withOgImage } from '@/components/og/og-metadata';
import { pageMetadata } from '@/lib/seo';
import Image from 'next/image';

type Props = { params: Promise<{ locale: string; currency: string; slug: string }> };
export const dynamicParams = false;
export function generateStaticParams(): { slug: string }[] {
  return VIBE_ENTRIES.map((v) => ({ slug: v.id }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const slug = (await params).slug;
  const vibe = VIBE_ENTRIES.find((v) => v.id === slug);
  if (!vibe) notFound();
  const seo = await getTranslations({ locale, namespace: 'seo' });
  const name = vibe.name[locale];
  return withOgImage(
    pageMetadata({
      locale,
      path: `/vibes/${slug}`,
      title: seo('vibeTitle', { name }),
      description: seo('vibeDescription', { name, description: vibe.description[locale] }),
    }),
    locale,
    { kind: 'home' },
  );
}
export default async function VibePage({ params }: Props): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const slug = (await params).slug;
  const vibe = VIBE_ENTRIES.find((v) => v.id === slug);
  if (!vibe) notFound();
  const image =
    CATEGORY_ENTRIES[vibe.id === 'performance' ? 1 : vibe.id === 'outdoor' ? 2 : 0]?.image;
  return (
    <Container as="main" className="py-12">
      <div id="main" tabIndex={-1} className="space-y-8">
        <header className="grid items-center gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h1 className="text-h1">{vibe.name[locale]}</h1>
            <p>{vibe.description[locale]}</p>
          </div>
          {image ? (
            <Image
              src={image.src}
              alt={image.alt[locale]}
              width={image.width}
              height={image.height}
              sizes="(min-width: 768px) 45vw, 90vw"
              className="aspect-video w-full rounded-md object-cover"
            />
          ) : null}
        </header>
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {PRODUCTS.filter((p) => p.vibes.includes(vibe.id)).map((product) => (
            <li key={product.id}>
              <ProductCard product={product} locale={locale} currency={currency} />
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
