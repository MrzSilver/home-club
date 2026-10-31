import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { renderOgImage } from '@/components/og/og-image';
import { JOURNAL_SLUGS, getArticle } from '@/content/journal';
import { LOCALES } from '@/data/locales';
import { localeFromParam } from '@/i18n/params';

// Journal article Open Graph image: the article's title on the brand card.
type Context = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams(): { locale: string; slug: string }[] {
  return LOCALES.flatMap((locale) => JOURNAL_SLUGS.map((slug) => ({ locale, slug })));
}

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { locale: rawLocale, slug: rawSlug } = await params;
  const locale = localeFromParam(rawLocale);
  const slug = JOURNAL_SLUGS.find((known) => known === rawSlug);
  if (!slug) notFound();
  // The card is drawn in English for every locale (see CARD_TEXT_LOCALE in og-image.tsx).
  const { meta } = await getArticle('en', slug);
  const og = await getTranslations({ locale: 'en', namespace: 'seo.og' });
  return renderOgImage({ locale, title: meta.title, eyebrow: og('journal') });
}
