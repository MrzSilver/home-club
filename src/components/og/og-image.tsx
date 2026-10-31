import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

import { OgCard } from '@/components/og/og-card';
import { OG_SIZE, loadOgColors, loadOgFonts } from '@/components/og/og-assets';
import type { Locale } from '@/data/schema';

// Satori has no complex-script shaping. The spike in docs/adr/0011-og-images.md showed Thai tone
// marks dropped after upper and lower vowels ("ที่" drew as "ที"), which changes what a word says.
// Until that is fixed upstream, the card text of every locale is drawn from the English catalogue
// (Latin only); the alt text and the page metadata stay fully localised. Flip a locale to 'th' here
// and load Noto Sans Thai in og-assets.ts to try again.
const CARD_TEXT_LOCALE: Readonly<Record<Locale, Locale>> = { en: 'en', th: 'en' };

export type OgImageInput = {
  locale: Locale;
  /** Title in the card's language (see CARD_TEXT_LOCALE); omitted for the default image. */
  title?: string;
  eyebrow?: string;
  swatches?: readonly string[];
};

export async function renderOgImage(input: OgImageInput): Promise<ImageResponse> {
  const cardLocale = CARD_TEXT_LOCALE[input.locale];
  const [colors, fonts, og, common] = await Promise.all([
    loadOgColors(),
    loadOgFonts(),
    getTranslations({ locale: cardLocale, namespace: 'seo.og' }),
    getTranslations({ locale: cardLocale, namespace: 'common' }),
  ]);
  return new ImageResponse(
    <OgCard
      colors={colors}
      wordmark={{ name: common('wordmark.name'), descriptor: common('wordmark.descriptor') }}
      title={input.title ?? og('tagline')}
      footer={og('demo')}
      {...(input.eyebrow ? { eyebrow: input.eyebrow } : {})}
      {...(input.swatches ? { swatches: input.swatches } : {})}
    />,
    { ...OG_SIZE, fonts },
  );
}
