import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { Container } from '@/components/ui/container';
import { buttonClasses } from '@/components/ui/button';
import { JOURNAL_SLUGS, getArticle } from '@/content/journal';
import { resolveRouteParams } from '@/i18n/params';
import { Link } from '@/i18n/navigation';
import { withOgImage } from '@/components/og/og-metadata';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; currency: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveRouteParams(params);
  const t = await getTranslations({ locale, namespace: 'content' });
  const seo = await getTranslations({ locale, namespace: 'seo' });
  return withOgImage(
    pageMetadata({
      locale,
      path: '/journal',
      title: t('journal'),
      description: seo('journalDescription'),
    }),
    locale,
    { kind: 'home' },
  );
}
export default async function JournalPage({ params }: Props): Promise<ReactElement> {
  const { locale } = await resolveRouteParams(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'content' });
  const articles = await Promise.all(JOURNAL_SLUGS.map((slug) => getArticle(locale, slug)));
  return (
    <Container as="main" className="py-12">
      <div id="main" tabIndex={-1} className="space-y-8">
        <h1 className="text-h1">{t('journal')}</h1>
        <p>{t('journalDescription')}</p>
        <ul className="grid gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <li key={article.slug} className="space-y-4 rounded-md bg-surface p-6">
              <h2 className="text-h2">{article.meta.title}</h2>
              <p>{article.meta.description}</p>
              <p className="text-small text-muted">{t('reading', { minutes: article.minutes })}</p>
              <Link
                href={`/journal/${article.slug}`}
                className={buttonClasses({ variant: 'link' })}
              >
                {t('read')}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
