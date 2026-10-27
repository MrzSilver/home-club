import { render, screen } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomePage, {
  dynamicParams,
  generateMetadata as homeMetadata,
} from '@/app/[locale]/[currency]/page';
import en from '@messages/en.json';
import th from '@messages/th.json';

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

async function renderPage(locale: 'en' | 'th', currency: string): Promise<void> {
  const page = await HomePage({ params: params(locale, currency) });
  const wrap = (node: ReactElement): ReactElement => (
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
});

describe('temporary home page (FR-070, FR-071, FR-072)', () => {
  it.each([
    ['en', 'usd', '$49.00', 'USD'],
    ['en', 'thb', '฿1,715', 'THB'],
    ['th', 'thb', '฿1,715', 'THB'],
    ['th', 'usd', 'US$49.00', 'USD'],
  ])(
    'shows the sample price for /%s with the %s segment as %s',
    async (locale, segment, price, currency) => {
      await renderPage(locale as 'en' | 'th', segment);

      const sample = screen.getByTestId('sample-price');
      expect(sample.textContent).toBe(price);
      expect(sample).toHaveAttribute('data-currency', currency);
      expect(setRequestLocale).toHaveBeenCalledWith(locale);
    },
  );

  it('renders one h1 from the message catalogue inside main#main, per locale', async () => {
    await renderPage('en', 'usd');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.home.title);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders the Thai h1 from the catalogue and leaves the chrome to the layout', async () => {
    await renderPage('th', 'thb');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(th.home.title);
    // The header and footer come from the locale layout, never from a page.
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('marks the bottom edge of its dark intro band for the transparent header', async () => {
    await renderPage('en', 'usd');
    const sentinel = document.querySelector('[data-header-sentinel]');
    expect(sentinel).toBeInTheDocument();
    expect(sentinel).toHaveAttribute('aria-hidden', 'true');
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
    expect(english.alternates).toEqual({
      canonical: '/en',
      languages: { en: '/en', th: '/th', 'x-default': '/en' },
    });

    const thai = await homeMetadata({ params: params('th', 'thb') });
    expect(thai.title).toEqual({ absolute: th.seo.homeTitle });
    expect(thai.alternates).toMatchObject({ canonical: '/th' });
    expect(JSON.stringify(thai.alternates)).not.toMatch(/usd|thb/);
  });
});
