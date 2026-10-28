import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TrustStrip } from '@/components/home/trust-strip';
import en from '@messages/en.json';
import th from '@messages/th.json';

vi.mock(
  'next-intl/server',
  async () => (await import('../helpers/intl-server-mock')).serverIntlModule,
);

describe('TrustStrip (FR-015)', () => {
  it('lists quality, responsible materials and fast delivery with a title and caption each', async () => {
    render(await TrustStrip({ locale: 'en' }));

    const region = screen.getByRole('region', { name: en.home.trust.heading });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    const copy = [en.home.trust.quality, en.home.trust.materials, en.home.trust.delivery];
    items.forEach((item, index) => {
      expect(item).toHaveTextContent(copy[index]?.title ?? '');
      expect(item).toHaveTextContent(copy[index]?.caption ?? '');
      expect(item.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('separates the columns with vertical line rules from md up, stacked on phones', async () => {
    render(await TrustStrip({ locale: 'en' }));

    const list = screen.getByRole('list');
    expect(list).toHaveClass('md:grid-cols-3', 'md:divide-x', 'md:divide-line');
  });

  it('makes no country, certification or number claim in either language (RULES 1.3)', () => {
    const texts = [en.home.trust, th.home.trust].flatMap((trust) =>
      [trust.quality, trust.materials, trust.delivery].flatMap((item) => [
        item.title,
        item.caption,
      ]),
    );
    for (const text of texts) {
      expect(text).not.toMatch(/\d/);
      expect(text).not.toMatch(/canada|thailand|ไทย|iso|certified|ได้รับการรับรอง|%/i);
    }
  });

  it('renders the Thai copy without uppercase styling on its own words', async () => {
    render(await TrustStrip({ locale: 'th' }));

    expect(screen.getByText(th.home.trust.quality.title)).toHaveClass('uppercase-latin');
    expect(screen.getByText(th.home.trust.quality.title)).not.toHaveClass('uppercase');
  });
});
