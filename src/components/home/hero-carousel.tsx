'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { HeroControls, HeroIndicators } from '@/components/home/hero-controls';
import { Container } from '@/components/ui/container';

/** How long a slide stays when the visitor has pressed play: calm, and never started by itself. */
export const HERO_AUTOPLAY_MS = 8000;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const readReducedMotion = (): boolean => window.matchMedia(REDUCED_MOTION).matches;
// The server cannot know the preference; the first client render may differ and React reconciles it.
const serverReducedMotion = (): boolean => false;

export type HeroSlideEntry = { id: string; node: ReactNode };

export type HeroLabels = {
  region: string;
  previous: string;
  next: string;
  play: string;
  pause: string;
  playUnavailable: string;
  /** One per slide, same order: "1 of 3", "Slide 1 of 3", "Slide 1 of 3". */
  slides: readonly string[];
  indicators: readonly string[];
  announcements: readonly string[];
};

type HeroCarouselProps = { slides: readonly HeroSlideEntry[]; labels: HeroLabels };

/**
 * The hero's interactive shell (FR-010, SPEC 13). The slides arrive as server-rendered nodes and are
 * only wrapped here, so the island holds the state (current slide, playing) and the controls, nothing
 * else. No autoplay until the visitor presses play, and never under `prefers-reduced-motion`. The live
 * region speaks only after a visitor's own action, never for an automatic change. The sentinel on the
 * bottom edge tells the header when the hero has scrolled away (DESIGN 5.2).
 */
export function HeroCarousel({ slides, labels }: HeroCarouselProps): ReactElement {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [announcement, setAnnouncement] = useState({ id: 0, text: '' });
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotion,
    serverReducedMotion,
  );
  const autoplay = playing && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return undefined;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % count),
      HERO_AUTOPLAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [autoplay, index, count]);

  // A visitor's own choice: change slide and announce it.
  function goTo(target: number): void {
    const next = (target + count) % count;
    setIndex(next);
    setAnnouncement((previous) => ({
      id: previous.id + 1,
      text: labels.announcements[next] ?? '',
    }));
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={labels.region}
      data-on-dark=""
      className="hero relative overflow-hidden bg-forest text-canvas"
    >
      {slides.map((slide, position) => (
        <div
          key={slide.id}
          role="group"
          aria-roledescription="slide"
          aria-label={labels.slides[position]}
          data-active={position === index ? '' : undefined}
          className="hero-slide"
        >
          {slide.node}
        </div>
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10">
        <Container className="flex items-center justify-between">
          <HeroIndicators labels={labels.indicators} current={index} onSelect={goTo} />
          <HeroControls
            previousLabel={labels.previous}
            nextLabel={labels.next}
            playLabel={labels.play}
            pauseLabel={labels.pause}
            playUnavailableLabel={labels.playUnavailable}
            playing={autoplay}
            playDisabled={reducedMotion}
            onPrevious={() => goTo(index - 1)}
            onNext={() => goTo(index + 1)}
            onToggle={() => setPlaying((current) => !current)}
          />
        </Container>
      </div>

      {/*
        role=status is an implicit polite live region. An explicit aria-live attribute would stop the
        modal menu from hiding the page for assistive technology (aria-hidden skips live regions).
      */}
      <div role="status" className="sr-only">
        <p key={announcement.id}>{announcement.text}</p>
      </div>
      <div
        data-header-sentinel=""
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px"
      />
    </section>
  );
}
