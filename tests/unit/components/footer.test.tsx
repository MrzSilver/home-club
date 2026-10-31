import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Footer } from '@/components/layout/footer';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  'next-intl/server',
  async () => (await import('../helpers/intl-server-mock')).serverIntlModule,
);
vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

async function renderFooter(locale: 'en' | 'th', year = 2031): Promise<void> {
  const footer = await Footer({ locale, year });
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      {footer}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  resetNavigationMock('/', 'en');
});

describe('Footer (FR-003)', () => {
  it('is the contentinfo landmark with the brand lockup, tagline and demo notice', async () => {
    await renderFooter('en');

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('Home Club')).toBeInTheDocument();
    expect(within(footer).getByText(en.footer.tagline)).toBeInTheDocument();
    expect(within(footer).getByText(en.footer.demoNotice)).toBeInTheDocument();
  });

  it('has a labelled footer navigation with Home, Shop all, the four categories and the case study as real links', async () => {
    await renderFooter('en');

    const nav = screen.getByRole('navigation', { name: en.footer.navLabel });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/en',
      '/en/shop',
      '/en/collections/foundations',
      '/en/collections/performance',
      '/en/collections/lifestyle',
      '/en/collections/accessories',
      '/en/case-study',
    ]);
  });

  it('shows the copyright year it is given (build-time, deterministic)', async () => {
    await renderFooter('en', 2031);

    expect(screen.getByText('© 2031 Home Club Foundation. A demo project.')).toBeInTheDocument();
  });

  it('renders the legal placeholders as plain text, never as dead links', async () => {
    await renderFooter('en');

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(en.footer.legal.privacy)).toBeInTheDocument();
    expect(within(footer).getByText(en.footer.legal.terms)).toBeInTheDocument();
    expect(within(footer).queryByRole('link', { name: en.footer.legal.privacy })).toBeNull();
    expect(within(footer).queryByRole('link', { name: en.footer.legal.terms })).toBeNull();
    for (const link of within(footer).getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^\/en(\/|$)/);
    }
  });

  it('contains the newsletter form with a visible label', async () => {
    await renderFooter('en');

    expect(
      screen.getByRole('heading', { level: 2, name: en.footer.newsletter.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(en.footer.newsletter.emailLabel)).toBeInTheDocument();
  });

  it('is fully Thai on a Thai page, with Thai category names and the Latin wordmark', async () => {
    resetNavigationMock('/', 'th');
    await renderFooter('th', 2031);

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(th.footer.demoNotice)).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'ไอเท็มพื้นฐาน' })).toHaveAttribute(
      'href',
      '/th/collections/foundations',
    );
    expect(
      within(footer).getByText('© 2031 Home Club Foundation โปรเจกต์ตัวอย่าง'),
    ).toBeInTheDocument();
    expect(within(footer).getByText('Home Club').closest('[lang]')).toHaveAttribute('lang', 'en');
  });
});
