import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MobileNav } from '@/components/layout/mobile-nav';
import type { MobileNavContent } from '@/components/layout/mobile-nav-types';
import { clickLink, resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);
vi.mock('next/navigation', () => ({ useParams: () => ({ currency: 'usd' }) }));

const CONTENT: MobileNavContent = {
  openLabel: 'Open menu',
  closeLabel: 'Close menu',
  title: 'Menu',
  navLabel: 'Main',
  primary: [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop all' },
  ],
  categoriesHeading: 'Shop by category',
  categories: [
    { href: '/collections/foundations', label: 'Foundations' },
    { href: '/collections/accessories', label: 'Accessories' },
  ],
  localeLabel: 'Language',
  localeNames: { en: 'English', th: 'ไทย' },
  currencyLabel: 'Currency',
  currencyNames: { USD: 'US dollar (USD)', THB: 'Thai baht (THB)' },
  currencyAnnouncements: { USD: 'Dollars.', THB: 'Baht.' },
};

function renderNav(): void {
  render(
    <NextIntlClientProvider locale="en" messages={{}}>
      <button type="button">Before</button>
      <MobileNav content={CONTENT} />
      <main>Page</main>
    </NextIntlClientProvider>,
  );
}

const trigger = (): HTMLElement => screen.getByRole('button', { name: 'Open menu', hidden: true });

async function openMenu(): Promise<HTMLElement> {
  fireEvent.click(trigger());
  return screen.findByRole('dialog', { name: 'Menu' });
}

beforeEach(() => {
  resetNavigationMock('/shop');
  document.body.removeAttribute('style');
});

describe('MobileNav (FR-001, RULES 8.6)', () => {
  it('starts closed: a labelled button that announces the dialog it opens', () => {
    renderNav();

    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a modal dialog named by its title, with the labelled main navigation', async () => {
    renderNav();

    const dialog = await openMenu();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    const nav = within(dialog).getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/en', '/en/shop', '/en/collections/foundations', '/en/collections/accessories']);
  });

  it('holds both switchers: language links and the currency radio group', async () => {
    renderNav();

    const dialog = await openMenu();

    expect(within(dialog).getByRole('list', { name: 'Language' })).toBeInTheDocument();
    expect(within(dialog).getByRole('group', { name: 'Currency' })).toBeInTheDocument();
  });

  it('moves focus into the dialog when it opens', async () => {
    renderNav();

    const dialog = await openMenu();

    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it('hides the page behind it from assistive technology while open', async () => {
    renderNav();

    await openMenu();

    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Before' })).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the hamburger', async () => {
    renderNav();
    const dialog = await openMenu();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes from the close button and returns focus to the hamburger', async () => {
    renderNav();
    const dialog = await openMenu();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close menu' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger()).toHaveFocus();
  });

  it('closes when a link is followed, because the layout (and this drawer) outlives the navigation', async () => {
    renderNav();
    const dialog = await openMenu();

    clickLink(within(dialog).getByRole('link', { name: 'Shop all' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens again after closing', async () => {
    renderNav();
    await openMenu();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(trigger());
    });

    expect(await screen.findByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
  });
});
