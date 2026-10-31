import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CaseStudyPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/[locale]/[currency]/case-study/page';
import { LOCALES } from '@/data/locales';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { resolveServerTree } from '../helpers/resolve-server-tree';

vi.mock(
  'next-intl/server',
  async () => (await import('../helpers/intl-server-mock')).serverIntlModule,
);

const params = (locale: string, currency: string): Promise<{ locale: string; currency: string }> =>
  Promise.resolve({ locale, currency });

describe('case-study route (FR-062, FR-071)', () => {
  it('prerenders every locale x currency and nothing else', () => {
    expect(dynamicParams).toBe(false);
    const all = generateStaticParams();
    expect(all).toHaveLength(LOCALES.length * 2);
    expect(all).toContainEqual({ locale: 'th', currency: 'thb' });
    expect(all).toContainEqual({ locale: 'en', currency: 'usd' });
  });

  it.each([
    ['en', en],
    ['th', th],
  ] as const)('renders exactly one h1 in %s (FR-062)', async (locale, messages) => {
    render(<>{await resolveServerTree(await CaseStudyPage({ params: params(locale, 'usd') }))}</>);
    const h1 = screen.getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent(messages.caseStudy.title);
  });

  it.each([
    ['en', en],
    ['th', th],
  ] as const)(
    'gives %s metadata a canonical URL without the currency segment (FR-071)',
    async (locale, messages) => {
      const metadata = await generateMetadata({ params: params(locale, 'thb') });
      expect(metadata.title).toBe(messages.seo.caseStudyTitle);
      expect(metadata.description).toBe(messages.seo.caseStudyDescription);
      expect(metadata.alternates?.canonical).toContain(`/${locale}/case-study`);
      expect(JSON.stringify(metadata.alternates)).not.toMatch(/\/(usd|thb)\//);
      expect(Object.keys(metadata.alternates?.languages ?? {})).toEqual(
        expect.arrayContaining(['en', 'th', 'x-default']),
      );
    },
  );

  it('points the social image at the default Open Graph card (FR-071)', async () => {
    const metadata = await generateMetadata({ params: params('en', 'usd') });
    const images = metadata.openGraph?.images;
    expect(JSON.stringify(images)).toContain('/en/og/home.png');
  });

  it('answers an unknown locale with not-found', async () => {
    await expect(generateMetadata({ params: params('fr', 'usd') })).rejects.toThrow();
  });
});
