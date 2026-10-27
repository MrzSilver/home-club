import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { LocaleLinks } from '@/components/ui/locale-links';
import {
  clickLink,
  navigationState,
  resetNavigationMock,
  routerMock,
} from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

const NAMES = { en: 'English', th: 'ไทย' };

function renderLinks(locale: 'en' | 'th', node: ReactElement): void {
  navigationState.locale = locale;
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      {node}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  resetNavigationMock('/shop');
  window.history.replaceState(null, '', '/en/shop');
});

describe('LocaleLinks / LocaleSwitcher (FR-002, FR-071)', () => {
  it('links to the same public path in each locale and marks the current one', () => {
    renderLinks('en', <LocaleLinks labels={NAMES} />);

    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en/shop');
    expect(screen.getByRole('link', { name: 'ไทย' })).toHaveAttribute('href', '/th/shop');
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'ไทย' })).not.toHaveAttribute('aria-current');
  });

  it('marks the Thai link current on a Thai page', () => {
    renderLinks('th', <LocaleLinks labels={NAMES} />);

    expect(screen.getByRole('link', { name: 'ไทย' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'English' })).not.toHaveAttribute('aria-current');
  });

  it('tags each name with its own language so ไทย keeps Thai typography on an English page (RULES 6.5)', () => {
    renderLinks('en', <LocaleLinks labels={NAMES} />);

    expect(screen.getByRole('link', { name: 'ไทย' })).toHaveAttribute('lang', 'th');
    expect(screen.getByText('ไทย')).toHaveAttribute('lang', 'th');
    expect(screen.getByText('English')).toHaveAttribute('lang', 'en');
  });

  it('keeps the home page as the locale root, not "/"', () => {
    resetNavigationMock('/');
    renderLinks('en', <LocaleLinks labels={NAMES} />);

    expect(screen.getByRole('link', { name: 'ไทย' })).toHaveAttribute('href', '/th');
  });

  it('carries the live query string over on a plain click (filters survive a language switch)', () => {
    window.history.replaceState(null, '', '/en/shop?color=sand&size=M');
    renderLinks('en', <LocaleLinks labels={NAMES} />);

    const { takenOver } = clickLink(screen.getByRole('link', { name: 'ไทย' }));

    expect(takenOver).toBe(true);
    expect(routerMock.push).toHaveBeenCalledWith('/shop?color=sand&size=M', { locale: 'th' });
  });

  it('leaves a click alone when there is no query string, so the plain link navigates', () => {
    renderLinks('en', <LocaleLinks labels={NAMES} />);

    const { takenOver } = clickLink(screen.getByRole('link', { name: 'ไทย' }));

    expect(takenOver).toBe(false);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it.each([['ctrlKey'], ['metaKey'], ['shiftKey']])(
    'leaves a %s click to the browser (open in a new tab)',
    (modifier) => {
      window.history.replaceState(null, '', '/en/shop?color=sand');
      renderLinks('en', <LocaleLinks labels={NAMES} />);

      clickLink(screen.getByRole('link', { name: 'ไทย' }), { [modifier]: true });

      expect(routerMock.push).not.toHaveBeenCalled();
    },
  );

  it('tells the surrounding drawer when a link is used', () => {
    const onNavigate = vi.fn();
    renderLinks('en', <LocaleLinks labels={NAMES} onNavigate={onNavigate} />);

    clickLink(screen.getByRole('link', { name: 'ไทย' }));

    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('names the list with the visible "Language" heading', () => {
    renderLinks('en', <LocaleSwitcher label="Language" names={NAMES} />);

    expect(screen.getByRole('list', { name: 'Language' })).toBeInTheDocument();
  });
});
