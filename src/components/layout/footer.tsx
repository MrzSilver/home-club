import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { DemoNotice } from '@/components/layout/demo-notice';
import { categoryLinks, primaryLinks } from '@/components/layout/nav-links';
import { NewsletterFields, type NewsletterCopy } from '@/components/layout/newsletter-fields';
import { NewsletterLoader } from '@/components/layout/newsletter-loader';
import { BrandMark } from '@/components/ui/brand-mark';
import { Container } from '@/components/ui/container';
import { Wordmark } from '@/components/ui/wordmark';
import type { Locale } from '@/data/schema';
import { Link } from '@/i18n/navigation';

type FooterProps = {
  locale: Locale;
  /** Copyright year. Defaults to the build year: pages are static, so it is fixed at build time. */
  year?: number;
};

/**
 * Site footer (FR-003, DESIGN 8 "Footer band"): brand lockup, tagline, the demo-only "Join the Club"
 * form, real links to the shop (also the only no-JavaScript route into the catalogue, since the menu
 * is a drawer), legal placeholders as plain text, the demo notice and the copyright line.
 */
export async function Footer({
  locale,
  year = new Date().getFullYear(),
}: FooterProps): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const common = await getTranslations({ locale, namespace: 'common' });

  const newsletter: NewsletterCopy = {
    title: t('newsletter.title'),
    description: t('newsletter.description'),
    emailLabel: t('newsletter.emailLabel'),
    submitLabel: t('newsletter.submit'),
    errors: { required: t('newsletter.errors.required'), invalid: t('newsletter.errors.invalid') },
    success: t('newsletter.success'),
  };

  const links = [
    ...primaryLinks({ home: nav('links.home'), shopAll: nav('links.shopAll') }),
    ...categoryLinks(locale),
  ];

  return (
    <footer className="mt-section border-t border-line">
      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_1fr_1fr] lg:items-start">
        <div className="flex items-center gap-4">
          <BrandMark className="size-12" />
          <div className="space-y-2">
            <Wordmark
              name={common('wordmark.name')}
              descriptor={common('wordmark.descriptor')}
              align="start"
            />
            <p className="text-small text-muted">{t('tagline')}</p>
          </div>
        </div>

        <nav aria-label={t('navLabel')}>
          <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  className="flex min-h-11 items-center text-small underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <NewsletterLoader copy={newsletter}>
          <NewsletterFields copy={newsletter} />
        </NewsletterLoader>
      </Container>

      <Container className="space-y-4 pb-10">
        <DemoNotice>{t('demoNotice')}</DemoNotice>
        <div className="flex flex-col gap-2 text-small text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t('copyright', { year: String(year) })}</p>
          {/* Placeholders, not links: there are no legal pages to point to (no dead links). */}
          <p>
            <span>{t('legal.privacy')}</span> · <span>{t('legal.terms')}</span>
            <span className="block sm:ms-3 sm:inline">{t('legal.note')}</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
