import { render, screen, within } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomePage, {
  dynamicParams,
  generateMetadata as homeMetadata,
} from '@/app/[locale]/[currency]/page';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { mockMatchMedia } from '../helpers/match-media';
import { resetNavigationMock } from '../helpers/navigation-mock';
import { resolveServerTree } from '../helpers/resolve-server-tree';

// The pages call next-intl's server API, which needs a Next.js request. Replace just that module with
// translators built from the real catalogues, so the tests still read the real copy.
const { setRequestLocale } = vi.hoisted(() => ({ setRequestLocale: vi.fn() }));
vi.mock('next-intl/server', () => ({
  setRequestLocale,
  getTranslations: ({ locale, namespace }: { locale: 'en' | 'th'; namespace: string }) =>
    Promise.resolve(
      createTranslator({
        locale,
        messages: locale === 'th' ? th : en,
        namespace: namespace as never,
      }),
    ),
}));

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

async function renderPage(locale: 'en' | 'th', currency: string): Promise<void> {
  const page = await resolveServerTree(await HomePage({ params: params(locale, currency) }));
  const wrap = (node: ReactNode): ReactElement => (
    <NextIntlClientProvider locale={locale} messages={{}}>
      {node}
    </NextIntlClientProvider>
  );
  render(wrap(page));
}

const params = (locale: string, currency: string): Promise<{ locale: string; currency: string }> =>
  Promise.resolve({ locale, currency });

beforeEach(() => {
  setRequestLocale.mockClear();
  resetNavigationMock('/', 'en');
  mockMatchMedia();
});

const SECTION_NAMES = {
  en: [
    en.home.hero.label,
    en.home.categories.heading,
    en.home.essentials.title,
    en.home.trust.heading,
  ],
  th: [
    th.home.hero.label,
    th.home.categories.heading,
    th.home.essentials.title,
    th.home.trust.heading,
  ],
} as const;

describe('home page (FR-010, FR-011, FR-012, FR-015, FR-070, FR-071, FR-072)', () => {
  it.each(['en', 'th'] as const)(
    'puts the hero, category tiles, essentials and trust strip in the DESIGN 8 order (%s)',
    async (locale) => {
      await renderPage(locale, locale === 'en' ? 'usd' : 'thb');

      const regions = within(screen.getByRole('main')).getAllByRole('region');
      expect(regions.map((region) => region.getAttribute('aria-label') ?? '')).toEqual([
        SECTION_NAMES[locale][0],
        '',
        '',
        '',
      ]);
      const headings = screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent);
      expect(headings).toEqual(SECTION_NAMES[locale].slice(1));
      expect(setRequestLocale).toHaveBeenCalledWith(locale);
    },
  );

  it('renders exactly one h1: the first slide headline, in the page language (FR-010)', async () => {
    await renderPage('en', 'usd');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(h1).toHaveTextContent(en.home.hero.slides.discover.line1);
    expect(h1).toHaveTextContent(en.home.hero.slides.discover.line2);
    // The other slides' headlines are not headings.
    expect(screen.getByText(en.home.hero.slides.performance.line1).tagName).toBe('SPAN');
  });

  it('renders the Thai h1 and leaves the chrome to the layout', async () => {
    await renderPage('th', 'thb');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      th.home.hero.slides.discover.line1,
    );
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('marks the hero bottom edge for the transparent header, once', async () => {
    await renderPage('en', 'usd');
    const sentinels = document.querySelectorAll('[data-header-sentinel]');
    expect(sentinels).toHaveLength(1);
    expect(sentinels[0]).toHaveAttribute('aria-hidden', 'true');
    expect(sentinels[0]?.closest('[aria-roledescription="carousel"]')).not.toBeNull();
  });

  it.each([
    ['en', 'usd', ['$49.00', '$89.00', '$59.00', '$39.00']],
    ['en', 'thb', ['฿1,715', '฿3,115', '฿2,065', '฿1,365']],
    ['th', 'thb', ['฿1,715', '฿3,115', '฿2,065', '฿1,365']],
    ['th', 'usd', ['US$49.00', 'US$89.00', 'US$59.00', 'US$39.00']],
  ] as const)(
    'shows the four essentials with prices from the data in /%s with the %s segment',
    async (locale, segment, prices) => {
      await renderPage(locale, segment);
      const shown = screen.getAllByTestId('product-price');
      expect(shown.map((node) => node.textContent)).toEqual(prices);
      for (const node of shown)
        expect(node).toHaveAttribute('data-currency', segment.toUpperCase());
    },
  );

  it('links the four category tiles to their collections and the hero and "see all" to the shop', async () => {
    await renderPage('en', 'usd');
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    for (const category of ['foundations', 'performance', 'lifestyle', 'accessories']) {
      expect(hrefs).toContain(`/en/collections/${category}`);
    }
    expect(hrefs).toContain('/en/shop');
    expect(hrefs.filter((href) => href?.startsWith('/en/products/'))).toHaveLength(4);
  });

  it('never renders an unlisted locale or currency on demand', () => {
    expect(dynamicParams).toBe(false);
  });

  it('answers 404 for a locale or currency the router should never pass', async () => {
    await expect(HomePage({ params: params('fr', 'usd') })).rejects.toBeDefined();
    await expect(HomePage({ params: params('en', 'eur') })).rejects.toBeDefined();
  });

  it('builds localized metadata with public canonical and hreflang URLs (FR-071)', async () => {
    const english = await homeMetadata({ params: params('en', 'usd') });
    expect(english.title).toEqual({ absolute: en.seo.homeTitle });
    expect(english.description).toBe(en.seo.homeDescription);
    expect(english.alternates).toEqual({
      canonical: '/en',
      languages: { en: '/en', th: '/th', 'x-default': '/en' },
    });
    expect(english.openGraph).toMatchObject({
      type: 'website',
      locale: 'en_US',
      alternateLocale: ['th_TH'],
      title: en.seo.homeTitle,
      description: en.seo.homeDescription,
      url: '/en',
    });

    const thai = await homeMetadata({ params: params('th', 'thb') });
    expect(thai.title).toEqual({ absolute: th.seo.homeTitle });
    expect(thai.description).toBe(th.seo.homeDescription);
    expect(thai.alternates).toMatchObject({ canonical: '/th' });
    expect(thai.openGraph).toMatchObject({ locale: 'th_TH', alternateLocale: ['en_US'] });
    expect(JSON.stringify(thai)).not.toMatch(/usd|thb/);
  });
});
