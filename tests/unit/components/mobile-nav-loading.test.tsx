import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { MobileNav } from '@/components/layout/mobile-nav';
import type { MobileNavContent } from '@/components/layout/mobile-nav-types';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);
vi.mock('next/navigation', () => ({ useParams: () => ({ currency: 'usd' }) }));

// A drawer module that arrives only when the test lets it, like a slow connection.
const gate = vi.hoisted(() => {
  let release: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release: () => release() };
});
vi.mock('@/components/layout/mobile-nav-panel', async (importOriginal) => {
  await gate.promise;
  return importOriginal();
});

const CONTENT: MobileNavContent = {
  openLabel: 'Open menu',
  closeLabel: 'Close menu',
  title: 'Menu',
  navLabel: 'Main',
  primary: [{ href: '/', label: 'Home' }],
  categoriesHeading: 'Shop by category',
  categories: [],
  localeLabel: 'Language',
  localeNames: { en: 'English', th: 'ไทย' },
  currencyLabel: 'Currency',
  currencyNames: { USD: 'US dollar (USD)', THB: 'Thai baht (THB)' },
  currencyAnnouncements: { USD: 'Dollars.', THB: 'Baht.' },
};

describe('MobileNav first open on a slow link', () => {
  it('is busy, not expanded, and shows no dialog until the code has arrived', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <MobileNav content={CONTENT} />
      </NextIntlClientProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    fireEvent.click(trigger);

    await waitFor(() => expect(trigger).toHaveAttribute('aria-busy', 'true'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    gate.release();

    expect(await screen.findByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu', hidden: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Open menu', hidden: true })).not.toHaveAttribute(
      'aria-busy',
    );
  });
});
