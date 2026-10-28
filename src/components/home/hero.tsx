import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { prefetchFor } from '@/components/catalogue/prefetch';
import { HeroCarousel, type HeroSlideEntry } from '@/components/home/hero-carousel';
import { buttonClasses } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { HERO_IMAGES } from '@/data/brand';
import type { Locale } from '@/data/schema';
import { Link } from '@/i18n/navigation';

// Slide order matches HERO_IMAGES. `focus` keeps the figure in frame when a phone crops the 16:9
// picture to a tall box; from md the box is wide enough to show the whole width.
const SLIDES = [
  { id: 'discover', route: 'shop', href: '/shop', focus: 'object-[55%_50%] md:object-center' },
  {
    id: 'performance',
    route: 'collections',
    href: '/collections/performance',
    focus: 'object-[66%_50%] md:object-center',
  },
  {
    id: 'lifestyle',
    route: 'collections',
    href: '/collections/lifestyle',
    focus: 'object-[76%_50%] md:object-center',
  },
] as const;

type HeroProps = { locale: Locale };

/**
 * Home hero (FR-010, DESIGN 5.3). Server-rendered: every slide, its picture, headline and button are
 * in the HTML; only the carousel shell is a client island. The first slide's headline is the page's
 * one `h1`, the others are paragraphs. Only the first picture is `priority` (the LCP image).
 */
export async function Hero({ locale }: HeroProps): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'home' });
  const total = SLIDES.length;

  const copy = {
    discover: {
      line1: t('hero.slides.discover.line1'),
      line2: t('hero.slides.discover.line2'),
      cta: t('hero.slides.discover.cta'),
    },
    performance: {
      line1: t('hero.slides.performance.line1'),
      line2: t('hero.slides.performance.line2'),
      cta: t('hero.slides.performance.cta'),
    },
    lifestyle: {
      line1: t('hero.slides.lifestyle.line1'),
      line2: t('hero.slides.lifestyle.line2'),
      cta: t('hero.slides.lifestyle.cta'),
    },
  };

  const slides: HeroSlideEntry[] = SLIDES.map((slide, position) => {
    const image = HERO_IMAGES[position];
    const text = copy[slide.id];
    const Headline = position === 0 ? 'h1' : 'p';
    return {
      id: slide.id,
      node: (
        <>
          {image === undefined ? null : (
            <Image
              src={image.src}
              alt={image.alt[locale]}
              width={image.width}
              height={image.height}
              sizes="100vw"
              {...(position === 0 ? { priority: true, fetchPriority: 'high' as const } : {})}
              className={`absolute inset-0 size-full object-cover ${slide.focus}`}
            />
          )}
          <div aria-hidden="true" className="hero-scrim absolute inset-0" />
          <Container className="relative flex h-full items-end pb-28 md:pb-32">
            <div className="w-full md:w-3/5 lg:w-1/2">
              <Headline className="text-display text-balance uppercase-latin">
                <span className="block">{text.line1}</span>{' '}
                <span className="block text-sand">{text.line2}</span>
              </Headline>
              <Link
                href={slide.href}
                prefetch={prefetchFor(slide.route)}
                className={buttonClasses({ variant: 'on-image', className: 'mt-6' })}
              >
                {text.cta}
              </Link>
            </div>
          </Container>
        </>
      ),
    };
  });

  return (
    <HeroCarousel
      slides={slides}
      labels={{
        region: t('hero.label'),
        previous: t('hero.previous'),
        next: t('hero.next'),
        play: t('hero.play'),
        pause: t('hero.pause'),
        playUnavailable: t('hero.playUnavailable'),
        slides: SLIDES.map((_, position) => t('hero.slide', { n: position + 1, total })),
        indicators: SLIDES.map((_, position) => t('hero.indicator', { n: position + 1, total })),
        announcements: SLIDES.map((_, position) => t('hero.announce', { n: position + 1, total })),
      }}
    />
  );
}
