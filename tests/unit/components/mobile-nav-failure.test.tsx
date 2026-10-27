import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MobileNav } from '@/components/layout/mobile-nav';
import type { MobileNavContent } from '@/components/layout/mobile-nav-types';

vi.mock('@/components/layout/mobile-nav-panel', () => {
  throw new Error('Loading chunk failed');
});

const CONTENT: MobileNavContent = {
  openLabel: 'Open menu',
  closeLabel: 'Close menu',
  title: 'Menu',
  navLabel: 'Main',
  primary: [],
  categoriesHeading: 'x',
  categories: [],
  localeLabel: 'Language',
  localeNames: { en: 'English', th: 'ไทย' },
  currencyLabel: 'Currency',
  currencyNames: { USD: 'US dollar (USD)', THB: 'Thai baht (THB)' },
  currencyAnnouncements: { USD: 'Dollars.', THB: 'Baht.' },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MobileNav when the drawer code cannot be loaded', () => {
  it('goes back to idle (not expanded, not busy) and reports the failure instead of hanging', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <MobileNav content={CONTENT} />
      </NextIntlClientProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    fireEvent.click(trigger);

    await waitFor(() => expect(error).toHaveBeenCalled());
    await waitFor(() => expect(trigger).not.toHaveAttribute('aria-busy'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
