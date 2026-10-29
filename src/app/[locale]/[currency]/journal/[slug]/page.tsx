import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { Container } from '@/components/ui/container';
import { ProductCard } from '@/components/catalogue/product-card';
import { JOURNAL_SLUGS, getArticle } from '@/content/journal';
import { PRODUCTS } from '@/data/products';
import { resolveRouteParams } from '@/i18n/params';
import { languageAlternates } from '@/lib/locale-path';

type Props = { params: Promise<{ locale: string; currency: string; slug: string }> };
export const dynamicParams = false;
export function generateStaticParams(): { slug: string }[] {
  return JOURNAL_SLUGS.map((slug) => ({ slug }));
}
function knownSlug(slug: string): (typeof JOURNAL_SLUGS)[number] {
  const known = JOURNAL_SLUGS.find((s) => s === slug);
  if (!known) notFound();
  return known;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const slug = knownSlug((await params).slug);
  const { meta } = await getArticle(locale, slug);
  return {
    title: meta.title,
    description: meta.description,
    alternates: languageAlternates(locale, `/journal/${slug}`),
  };
}
export default async function ArticlePage({ params }: Props): Promise<ReactElement> {
  const { locale, currency } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const { meta, minutes, Content } = await getArticle(locale, knownSlug((await params).slug));
  const t = await getTranslations({ locale, namespace: 'content' });
  return (
    <Container as="main" className="py-12">
      <div id="main" tabIndex={-1} className="space-y-12">
        <article className="mx-auto max-w-prose space-y-6">
          <h1 className="text-h1">{meta.title}</h1>
          <p className="text-muted">{t('reading', { minutes })}</p>
          <div className="space-y-6 [&_h2]:text-h2 [&_h2]:pt-6 [&_p]:leading-relaxed">
            <Content />
          </div>
        </article>
        <section aria-labelledby="related-heading" className="space-y-6">
          <h2 id="related-heading" className="text-h2">
            {t('related')}
          </h2>
          <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {PRODUCTS.filter((p) => meta.related.includes(p.slug)).map((product) => (
              <li key={product.id}>
                <ProductCard product={product} locale={locale} currency={currency} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
