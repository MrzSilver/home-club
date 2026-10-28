import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HeaderSurface } from '@/components/layout/header-surface';
import { navigationState, resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

type ObserverCall = {
  callback: IntersectionObserverCallback;
  target: Element | null;
  options: IntersectionObserverInit | undefined;
  disconnect: () => void;
};

const observers: ObserverCall[] = [];
const headerHeight = { value: 64 };

class FakeIntersectionObserver {
  readonly call: ObserverCall;
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.call = { callback, options, target: null, disconnect: vi.fn<() => void>() };
    observers.push(this.call);
  }
  observe(target: Element): void {
    this.call.target = target;
  }
  disconnect(): void {
    this.call.disconnect();
  }
}

class FakeResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
  disconnect(): void {}
}

/** The latest observer reports the sentinel's state, with the root edge `rootTop` px down (the header). */
function report(isIntersecting: boolean, top: number, rootTop = headerHeight.value): void {
  const last = observers.at(-1);
  if (last === undefined) throw new Error('no observer');
  act(() => {
    last.callback(
      [
        {
          isIntersecting,
          boundingClientRect: { top },
          rootBounds: { top: rootTop },
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
}

function addSentinel(): HTMLElement {
  const sentinel = document.createElement('div');
  sentinel.setAttribute('data-header-sentinel', '');
  document.body.append(sentinel);
  return sentinel;
}

beforeEach(() => {
  observers.length = 0;
  headerHeight.value = 64;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => headerHeight.value,
  });
  resetNavigationMock('/');
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
  document.body.innerHTML = '';
});

const header = (): HTMLElement => screen.getByRole('banner');
const past = (): boolean => header().hasAttribute('data-past-hero');

describe('HeaderSurface (DESIGN 5.2)', () => {
  it('is a banner styled by the site-header rules (transparency comes from CSS, not from a path list)', () => {
    render(<HeaderSurface>content</HeaderSurface>);

    expect(header()).toHaveClass('site-header');
    expect(past()).toBe(false);
  });

  it('marks itself data-js once the island runs, which is what makes a hero page header sticky', () => {
    render(<HeaderSurface>content</HeaderSurface>);

    expect(header()).toHaveAttribute('data-js', '');
  });

  it('observes the page sentinel with the live header height as the top margin', () => {
    const sentinel = addSentinel();
    render(<HeaderSurface>x</HeaderSurface>);

    expect(observers.at(-1)?.target).toBe(sentinel);
    expect(observers.at(-1)?.options?.rootMargin).toBe('-64px 0px 0px 0px');
  });

  it('turns solid when the sentinel has crossed the header edge, not only the viewport top (gradual scrolling)', () => {
    addSentinel();
    render(<HeaderSurface>x</HeaderSurface>);

    // The callback fires when the sentinel reaches the root's top edge, which is the header's bottom
    // edge: top equals the root's top (64), not 0. A check against 0 would never fire.
    report(false, 63);
    expect(past()).toBe(true);

    report(true, 300);
    expect(past()).toBe(false);
  });

  it('stays transparent for a sentinel that has not been reached yet (still below the viewport)', () => {
    addSentinel();
    render(<HeaderSurface>x</HeaderSurface>);

    report(false, 5000);

    expect(past()).toBe(false);
  });

  it('uses the entry root edge, so 64px on mobile and 80px on desktop both work', () => {
    headerHeight.value = 80;
    addSentinel();
    render(<HeaderSurface>x</HeaderSurface>);

    expect(observers.at(-1)?.options?.rootMargin).toBe('-80px 0px 0px 0px');
    report(false, 79, 80);
    expect(past()).toBe(true);
  });

  it('does nothing on a page without a sentinel (solid header, no observer)', () => {
    render(<HeaderSurface>x</HeaderSurface>);

    expect(observers).toHaveLength(0);
    expect(past()).toBe(false);
  });

  it('uses one IntersectionObserver (no scroll listener) and releases it on unmount', () => {
    addSentinel();
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const { unmount } = render(<HeaderSurface>x</HeaderSurface>);

    expect(addEventListener).not.toHaveBeenCalledWith('scroll', expect.anything(), undefined);
    const last = observers.at(-1);
    unmount();
    expect(last?.disconnect).toHaveBeenCalled();
  });

  it('looks for the new page sentinel when the route changes', () => {
    const { rerender } = render(<HeaderSurface>x</HeaderSurface>);
    expect(observers).toHaveLength(0);

    addSentinel();
    navigationState.pathname = '/other';
    rerender(<HeaderSurface>x</HeaderSurface>);

    expect(observers.at(-1)?.target).toBe(document.querySelector('[data-header-sentinel]'));
  });

  it('fades its two background layers instead of animating colours, and not at all under reduced motion', () => {
    const { container } = render(<HeaderSurface>x</HeaderSurface>);

    const layers = container.querySelectorAll('header > div[aria-hidden="true"]');
    expect(layers).toHaveLength(2);
    for (const layer of layers) {
      expect(layer).toHaveClass('transition-opacity', 'motion-reduce:transition-none');
    }
  });
});
