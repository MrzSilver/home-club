import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductCard } from '@/components/catalogue/product-card';
import type { Product } from '@/data/schema';
import { getProductBySlug } from '@/lib/catalogue';
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
  it('keeps colour buttons outside the product link (FR-022)', async () => {
    await renderCard('en', 'USD');

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/en/products/essential-tee');
    expect(within(links[0] as HTMLElement).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(tee.colors.length);
    expect(document.querySelectorAll('a a')).toHaveLength(0);
  });

  it.each(['en', 'th'] as const)(
    'changes both images in place with a keyboard-accessible button: %s (FR-022)',
    async (locale) => {
      await renderCard(locale, 'USD');
      const color = tee.colors.find((item) => item.id === 'black');
      if (color === undefined) throw new Error('missing colour');
      const link = screen.getByRole('link');
      const destination = link.getAttribute('href');
      const button = screen.getByRole('button', { name: color.name[locale] });
      expect(button).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
      const images = document.querySelectorAll('img');
      expect(images[0]?.getAttribute('src')).toContain('black-1');
      expect(images[1]?.getAttribute('src')).toContain('black-2');
      expect(link).toHaveAttribute('href', destination);
    },
  );

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

  it('uses the back view on hover, with a CSS crossfade (FR-022)', async () => {
    await renderCard('en', 'USD');

    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0]?.getAttribute('src')).toMatch(/sand-1/);
    expect(images[1]?.getAttribute('src')).toMatch(/sand-2/);
    expect(tee.images.find((image) => image.src.endsWith('sand-2.webp'))?.view).toBe('back');
    expect(images[1]).toHaveClass(
      'opacity-0',
      'group-hover:opacity-100',
      'motion-reduce:transition-none',
    );
    expect(document.querySelector('a')).toHaveClass('group');
  });

  it('selects front/back by view metadata even when a side image comes first (FR-022)', async () => {
    resetNavigationMock('/', 'en');
    render(
      await ProductCard({
        product: { ...tee, images: tee.images.toReversed() },
        locale: 'en',
        currency: 'USD',
      }),
    );
    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0]?.getAttribute('src')).toMatch(/sand-1/);
    expect(images[1]?.getAttribute('src')).toMatch(/sand-2/);
  });

  it('has no quick-add control in phase 1', async () => {
    await renderCard('en', 'USD');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  });

  it('says "Sold out" in text when no variant has stock, and only then (FR-022)', async () => {
    await renderCard('en', 'USD');
    expect(screen.queryByText(en.catalogue.card.soldOut)).not.toBeInTheDocument();
    cleanup();

    const soldOut: Product = {
      ...tee,
      variants: tee.variants.map((variant) => ({ ...variant, stock: 0 })),
    };
    render(await ProductCard({ product: soldOut, locale: 'en', currency: 'USD' }));

    expect(screen.getByText('Sold out')).toBeInTheDocument();
    // Still one link, price still shown: a sold-out product is not hidden or disabled.
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByTestId('product-price')).toHaveTextContent('$49.00');
  });

  it('says it in Thai too', async () => {
    const soldOut: Product = {
      ...tee,
      variants: tee.variants.map((variant) => ({ ...variant, stock: 0 })),
    };
    render(await ProductCard({ product: soldOut, locale: 'th', currency: 'THB' }));

    expect(screen.getByText(th.catalogue.card.soldOut)).toBeInTheDocument();
  });

  it('loads only the first picture eagerly, and only when asked (RULES 9.3)', async () => {
    await renderCard('en', 'USD');
    for (const image of document.querySelectorAll('img')) {
      expect(image).toHaveAttribute('loading', 'lazy');
    }
    cleanup();

    render(await ProductCard({ product: tee, locale: 'en', currency: 'USD', priority: true }));

    const [primary, alternate] = [...document.querySelectorAll('img')];
    expect(primary).not.toHaveAttribute('loading', 'lazy');
    expect(alternate).toHaveAttribute('loading', 'lazy');
  });
});
