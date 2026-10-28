import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HERO_AUTOPLAY_MS, HeroCarousel } from '@/components/home/hero-carousel';
import { mockMatchMedia } from '../helpers/match-media';

const labels = {
  region: 'Featured',
  previous: 'Previous slide',
  next: 'Next slide',
  play: 'Start automatic slide change',
  pause: 'Pause automatic slide change',
  playUnavailable: 'Automatic slide change is off because your device asks for less motion.',
  slides: ['1 of 3', '2 of 3', '3 of 3'],
  indicators: ['Slide 1 of 3', 'Slide 2 of 3', 'Slide 3 of 3'],
  announcements: ['Showing slide 1 of 3', 'Showing slide 2 of 3', 'Showing slide 3 of 3'],
};

const slides = [
  { id: 'a', node: <p>First headline</p> },
  { id: 'b', node: <p>Second headline</p> },
  { id: 'c', node: <p>Third headline</p> },
];

function renderHero(): void {
  render(<HeroCarousel slides={slides} labels={labels} />);
}

const slideGroups = (): HTMLElement[] =>
  screen
    .getAllByRole('group', { hidden: true })
    .filter((group) => group.hasAttribute('aria-roledescription'));
const activeIndex = (): number =>
  slideGroups().findIndex((group) => group.hasAttribute('data-active'));
const live = (): HTMLElement => screen.getByRole('status');

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('HeroCarousel (FR-010, SPEC 13)', () => {
  it('is a labelled carousel of numbered slides, the first one active', () => {
    renderHero();

    const region = screen.getByRole('region', { name: 'Featured' });
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    expect(slideGroups().map((group) => group.getAttribute('aria-label'))).toEqual(labels.slides);
    for (const group of slideGroups()) {
      expect(group).toHaveAttribute('aria-roledescription', 'slide');
    }
    expect(activeIndex()).toBe(0);
  });

  it('renders every slide in the HTML and keeps the sentinel on the bottom edge', () => {
    renderHero();

    for (const text of ['First headline', 'Second headline', 'Third headline']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(document.querySelector('[data-header-sentinel]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('region')).toHaveAttribute('data-on-dark', '');
  });

  it('goes next and previous with wrap-around', () => {
    renderHero();

    fireEvent.click(screen.getByRole('button', { name: labels.next }));
    expect(activeIndex()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: labels.next }));
    fireEvent.click(screen.getByRole('button', { name: labels.next }));
    expect(activeIndex()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: labels.previous }));
    expect(activeIndex()).toBe(2);
  });

  it('jumps with the indicators, which are buttons marking the current slide with aria-current', () => {
    renderHero();

    const indicators = labels.indicators.map((name) => screen.getByRole('button', { name }));
    expect(indicators[0]).toHaveAttribute('aria-current', 'true');
    expect(indicators[1]).not.toHaveAttribute('aria-current');

    fireEvent.click(indicators[2] as HTMLElement);
    expect(activeIndex()).toBe(2);
    expect(indicators[2]).toHaveAttribute('aria-current', 'true');
    expect(indicators[0]).not.toHaveAttribute('aria-current');
  });

  it('is keyboard operable by construction: every control is a real, focusable button (Enter and Space click it natively)', () => {
    renderHero();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3 + 3); // indicators + previous, play, next
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toHaveAttribute('tabindex', '-1');
      button.focus();
      expect(button).toHaveFocus();
    }
    // Source order is reading order: indicators first, then previous, play, next.
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      ...labels.indicators,
      labels.previous,
      labels.play,
      labels.next,
    ]);
  });

  it('draws the indicator for the current slide longer, so state is not brightness alone', () => {
    renderHero();

    const bar = (name: string): Element | null =>
      screen.getByRole('button', { name }).querySelector('span');
    expect(bar('Slide 1 of 3')).toHaveClass('w-8', 'h-1');
    expect(bar('Slide 2 of 3')).toHaveClass('w-5', 'h-0.5');
    fireEvent.click(screen.getByRole('button', { name: 'Slide 2 of 3' }));
    expect(bar('Slide 2 of 3')).toHaveClass('w-8', 'h-1');
    expect(bar('Slide 1 of 3')).toHaveClass('w-5');
  });

  it('gives every control a 44 px touch target', () => {
    renderHero();

    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('size-11');
    }
  });

  describe('autoplay', () => {
    it('does not start by itself: no timer, no slide change', () => {
      vi.useFakeTimers();
      renderHero();

      act(() => {
        vi.advanceTimersByTime(HERO_AUTOPLAY_MS * 5);
      });
      expect(activeIndex()).toBe(0);
      expect(screen.getByRole('button', { name: labels.play })).toBeInTheDocument();
    });

    it('starts only when the visitor presses play, and pause stops it again', () => {
      vi.useFakeTimers();
      renderHero();

      fireEvent.click(screen.getByRole('button', { name: labels.play }));
      expect(screen.getByRole('button', { name: labels.pause })).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(HERO_AUTOPLAY_MS);
      });
      expect(activeIndex()).toBe(1);
      act(() => {
        vi.advanceTimersByTime(HERO_AUTOPLAY_MS);
      });
      expect(activeIndex()).toBe(2);

      fireEvent.click(screen.getByRole('button', { name: labels.pause }));
      act(() => {
        vi.advanceTimersByTime(HERO_AUTOPLAY_MS * 3);
      });
      expect(activeIndex()).toBe(2);
      expect(screen.getByRole('button', { name: labels.play })).toBeInTheDocument();
    });

    it('is calm: each slide stays at least five seconds', () => {
      expect(HERO_AUTOPLAY_MS).toBeGreaterThanOrEqual(5000);
    });

    it('restarts the wait after a manual change instead of cutting it short', () => {
      vi.useFakeTimers();
      renderHero();

      fireEvent.click(screen.getByRole('button', { name: labels.play }));
      act(() => {
        vi.advanceTimersByTime(HERO_AUTOPLAY_MS - 1000);
      });
      fireEvent.click(screen.getByRole('button', { name: labels.next }));
      expect(activeIndex()).toBe(1);
      act(() => {
        vi.advanceTimersByTime(HERO_AUTOPLAY_MS - 1);
      });
      expect(activeIndex()).toBe(1);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(activeIndex()).toBe(2);
    });

    it('never advances under prefers-reduced-motion: play is inert and says why', () => {
      vi.useFakeTimers();
      mockMatchMedia(true);
      renderHero();

      const play = screen.getByRole('button', { name: labels.play });
      expect(play).toHaveAttribute('aria-disabled', 'true');
      expect(play).toHaveAccessibleDescription(labels.playUnavailable);
      fireEvent.click(play);
      act(() => {
        vi.advanceTimersByTime(HERO_AUTOPLAY_MS * 3);
      });
      expect(activeIndex()).toBe(0);
      expect(screen.queryByRole('button', { name: labels.pause })).not.toBeInTheDocument();
    });

    it('stops a running autoplay when the visitor turns on reduced motion', () => {
      vi.useFakeTimers();
      const media = mockMatchMedia(false);
      renderHero();

      fireEvent.click(screen.getByRole('button', { name: labels.play }));
      act(() => {
        media.setReduced(true);
      });
      act(() => {
        vi.advanceTimersByTime(HERO_AUTOPLAY_MS * 3);
      });
      expect(activeIndex()).toBe(0);
    });
  });

  describe('live region', () => {
    it('is silent at first and for automatic changes', () => {
      vi.useFakeTimers();
      renderHero();
      expect(live()).toHaveTextContent('');

      fireEvent.click(screen.getByRole('button', { name: labels.play }));
      act(() => {
        vi.advanceTimersByTime(HERO_AUTOPLAY_MS);
      });
      expect(activeIndex()).toBe(1);
      expect(live()).toHaveTextContent('');
    });

    it('announces the slide after the visitor changes it, and again for a repeat', () => {
      renderHero();

      // An implicit live region: an explicit aria-live attribute would stop a modal from hiding the page.
      expect(document.querySelector('[aria-live]')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: labels.next }));
      const first = within(live()).getByText(labels.announcements[1] as string);
      fireEvent.click(screen.getByRole('button', { name: labels.indicators[1] as string }));
      const second = within(live()).getByText(labels.announcements[1] as string);
      // A fresh node, so assistive technology speaks the repeat as well.
      expect(second).not.toBe(first);
    });
  });
});
