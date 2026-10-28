import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryTile } from '@/components/home/category-tile';
import { getAllCategories } from '@/lib/catalogue';
import { resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

const category = getAllCategories()[0];
if (category === undefined) throw new Error('seed category missing');

describe('CategoryTile (FR-011, DESIGN 5.4)', () => {
  it('is one link to the collection, named by its title and subtitle', () => {
    resetNavigationMock('/', 'en');
    render(<CategoryTile category={category} locale="en" />);

    const link = screen.getByRole('link');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(link).toHaveAttribute('href', `/en/collections/${category.id}`);
    expect(link).toHaveAccessibleName(new RegExp(category.name.en, 'i'));
    expect(link).toHaveTextContent(category.subtitle.en);
  });

  it('uppercases the English title by class only, and leaves Thai alone', () => {
    resetNavigationMock('/', 'th');
    render(<CategoryTile category={category} locale="th" />);

    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveTextContent(category.name.th);
    expect(title).toHaveClass('uppercase-latin');
    expect(title).not.toHaveClass('uppercase');
    expect(screen.getByRole('link')).toHaveAttribute('href', `/th/collections/${category.id}`);
  });

  it('keeps the text on a dark scrim, uses data-on-dark for the light focus ring and scales the picture at most 1.03 with motion allowed', () => {
    resetNavigationMock('/', 'en');
    const { container } = render(<CategoryTile category={category} locale="en" />);

    expect(screen.getByRole('link')).toHaveAttribute('data-on-dark', '');
    expect(container.querySelector('.tile-scrim')).toHaveAttribute('aria-hidden', 'true');
    const image = container.querySelector('img');
    expect(image?.className).toContain('motion-safe:group-hover:scale-[1.03]');
  });

  it('treats the picture as decorative so the link is named by its title and subtitle, not a photo description', () => {
    resetNavigationMock('/', 'en');
    const { container } = render(<CategoryTile category={category} locale="en" />);

    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    const name = screen.getByRole('link').textContent;
    expect(name).toContain(category.name.en);
    expect(name).toContain(category.subtitle.en);
    expect(name).not.toContain(category.image.alt.en);
  });

  it('draws the arrow decoratively and shifts it only when motion is allowed', () => {
    resetNavigationMock('/', 'en');
    const { container } = render(<CategoryTile category={category} locale="en" />);

    const arrow = container.querySelector('svg');
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
    expect(arrow?.getAttribute('class')).toContain('motion-safe:group-hover:translate-x-1');
  });
});
