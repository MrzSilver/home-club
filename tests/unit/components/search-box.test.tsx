import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBox } from '@/components/search/search-box';
import type { SearchEntry } from '@/lib/search';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { navigationState, resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

const entries: SearchEntry[] = [
  { slug: 'classic-cap', category: 'accessories', tags: ['cap'], name: 'Cap', categoryName: 'Acc' },
];

function setup(locale: 'en' | 'th', initialQuery: string): void {
  navigationState.locale = locale;
  render(
    <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : th}>
      <SearchBox entries={entries} locale={locale} initialQuery={initialQuery} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => resetNavigationMock());

describe('SearchBox zero-result recovery (SPEC 13a)', () => {
  it.each(['en', 'th'] as const)(
    'clear empties the field and returns focus to it (%s)',
    (locale) => {
      const copy = (locale === 'en' ? en : th).search;
      setup(locale, 'zzzz');
      const field = screen.getByRole('searchbox');
      expect(screen.getByText(copy.empty)).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: copy.clear }));
      expect(field).toHaveValue('');
      expect(field).toHaveFocus();
      expect(screen.queryByText(copy.empty)).toBeNull();
      expect(screen.queryByRole('link', { name: copy.shopAll })).toBeNull();
    },
  );

  it.each(['en', 'th'] as const)('links to the shop in the same locale (%s)', (locale) => {
    setup(locale, 'zzzz');
    const copy = (locale === 'en' ? en : th).search;
    expect(screen.getByRole('link', { name: copy.shopAll })).toHaveAttribute(
      'href',
      `/${locale}/shop`,
    );
  });

  it('offers no recovery while there are results or no query', () => {
    setup('en', 'cap');
    expect(screen.queryByRole('button', { name: en.search.clear })).toBeNull();
  });

  it('keeps the query as text, not markup', () => {
    setup('en', '<b>x</b>');
    expect(screen.getByRole('searchbox')).toHaveValue('<b>x</b>');
    expect(document.querySelector('b')).toBeNull();
  });
});
