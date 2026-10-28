import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductCard } from '@/components/catalogue/product-card';
import type { Product } from '@/data/schema';
import { getProductBySlug } from '@/lib/catalogue';
import en from '@messages/en.json';
import { resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  'next-intl/server',
  async () => (await import('../helpers/intl-server-mock')).serverIntlModule,
);
vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

function seedTee(): Product {
  const product = getProductBySlug('essential-tee');
  if (product === undefined) throw new Error('seed product missing');
  return product;
}
const tee = seedTee();

async function renderCard(
  locale: 'en' | 'th',
  currency: 'USD' | 'THB',
  sizes?: string,
): Promise<void> {
  resetNavigationMock('/', locale);
  const card = await ProductCard({
    product: tee,
    locale,
    currency,
    ...(sizes === undefined ? {} : { sizes }),
  });
  render(card);
}

beforeEach(() => {
  resetNavigationMock('/', 'en');
});

describe('ProductCard (FR-022, SPEC 9)', () => {
  it('is one link to the product and has no other interactive element inside', async () => {
    await renderCard('en', 'USD');

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/en/products/essential-tee');
    expect(within(links[0] as HTMLElement).queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelectorAll('button, input, select, textarea, a a')).toHaveLength(0);
  });

  it.each([
    ['en', 'USD', '$49.00'],
    ['en', 'THB', '฿1,715'],
    ['th', 'THB', '฿1,715'],
    ['th', 'USD', 'US$49.00'],
  ] as const)('prices /%s in %s as %s from the integer cents', async (locale, currency, text) => {
    await renderCard(locale, currency);

    const price = screen.getByTestId('product-price');
    expect(price).toHaveTextContent(text);
    expect(price).toHaveAttribute('data-currency', currency);
  });

  it('names the product in the page language and uppercases only English by class', async () => {
    await renderCard('en', 'USD');
    const name = screen.getByRole('heading', { level: 3 });
    expect(name).toHaveTextContent(tee.name.en);
    expect(name).toHaveClass('text-eyebrow', 'uppercase-latin');
    // The class is what keeps Thai in its own case (RULES 6.5): it must never be `uppercase`.
    expect(name).not.toHaveClass('uppercase');
  });

  it('shows the Thai name for /th', async () => {
    await renderCard('th', 'THB');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(tee.name.th);
  });

  it('lists every colour name as one hidden sentence and draws a decorative swatch per colour', async () => {
    await renderCard('en', 'USD');

    const names = tee.colors.map((color) => color.name.en);
    const sentence = screen.getByText(/Available in/);
    for (const name of names) expect(sentence).toHaveTextContent(name);
    expect(sentence).toHaveTextContent(
      new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(names),
    );
    expect(en.catalogue.card.colors).toContain('{names}');
    const swatches = document.querySelectorAll('[aria-hidden="true"].rounded-full');
    expect(swatches).toHaveLength(names.length);
  });

  it('draws the default colour image on the surface backdrop, 1:1, with an empty alt (the name is the text)', async () => {
    await renderCard('en', 'USD', '50vw');

    const images = document.querySelectorAll('img');
    expect(images.length).toBeGreaterThanOrEqual(1);
    for (const image of images) {
      expect(image).toHaveAttribute('alt', '');
      expect(image.getAttribute('src')).toMatch(/essential-tee/);
      expect(image).toHaveAttribute('sizes', '50vw');
    }
    expect(document.querySelector('.aspect-card')).toHaveClass('bg-surface');
  });

  it('swaps to the second view on hover with CSS alone (no script, no state)', async () => {
    await renderCard('en', 'USD');

    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0]?.getAttribute('src')).toMatch(/sand-1/);
    expect(images[1]?.getAttribute('src')).toMatch(/sand-2/);
    expect(images[1]).toHaveClass(
      'opacity-0',
      'group-hover:opacity-100',
      'motion-reduce:transition-none',
    );
    expect(document.querySelector('a')).toHaveClass('group');
  });

  it('has no quick-add control in phase 1', async () => {
    await renderCard('en', 'USD');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  });
});
