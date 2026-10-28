import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogueExplorer } from '@/components/catalogue/catalogue-explorer';
import { ALL_COLORS, getAllCategories, getAllProducts } from '@/lib/catalogue';
import { toCatalogueItem } from '@/lib/catalogue-query';
import en from '@messages/en.json';
import { mockMatchMedia } from '../helpers/match-media';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/components/catalogue/filter-drawer', () => {
  throw new Error('Loading chunk failed');
});

function renderExplorer(): void {
  window.history.replaceState(null, '', '/en/shop');
  render(
    <NextIntlClientProvider locale="en" messages={{ catalogue: en.catalogue }}>
      <CatalogueExplorer
        scope={null}
        currency="USD"
        currencySymbol="$"
        items={getAllProducts().map(toCatalogueItem)}
        cards={{}}
        colors={ALL_COLORS}
        categories={getAllCategories().map(({ id, name }) => ({ id, name: name.en }))}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockMatchMedia();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('filters drawer when its code cannot be loaded', () => {
  it('goes back to idle (not expanded, not busy), reports the failure, and the sidebar controls still work', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderExplorer();
    const trigger = screen.getByRole('button', { name: 'Filters', hidden: true });

    fireEvent.click(trigger);

    await waitFor(() => expect(error).toHaveBeenCalledWith('The filters could not be loaded.'));
    await waitFor(() => expect(trigger).not.toHaveAttribute('aria-busy'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // A later press tries again.
    fireEvent.click(trigger);
    await waitFor(() => expect(error).toHaveBeenCalledTimes(2));
  });

  it('warms the chunk on hover without surfacing an error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderExplorer();

    await act(async () => {
      fireEvent.pointerEnter(screen.getByRole('button', { name: 'Filters', hidden: true }));
      await Promise.resolve();
    });

    expect(error).not.toHaveBeenCalled();
  });
});
