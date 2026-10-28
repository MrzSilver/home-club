import { parseQueryParams } from '@/lib/catalogue-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HOLD_KEYS,
  HOLD_ATTRIBUTE,
  HOLD_SCRIPT,
  HOLD_STYLE_ID,
  HOLD_TIMEOUT_MS,
} from '@/components/catalogue/query-hold';

// The script is plain JavaScript the server inlines. Run it the way a browser does, against jsdom.
function runHoldScript(search: string): void {
  const run = new Function('location', 'document', 'setTimeout', HOLD_SCRIPT) as (
    ...args: unknown[]
  ) => void;
  run({ search }, document, setTimeout);
}

beforeEach(() => {
  vi.useFakeTimers();
  document.getElementById(HOLD_STYLE_ID)?.remove();
});

afterEach(() => {
  vi.useRealTimers();
  document.getElementById(HOLD_STYLE_ID)?.remove();
});

describe('pre-paint hold for filtered links (ADR-0006)', () => {
  it('does nothing when the URL has no query string', () => {
    runHoldScript('');

    expect(document.getElementById(HOLD_STYLE_ID)).toBeNull();
  });

  it.each([
    '?category=lifestyle',
    '?color=black',
    '?size=M',
    '?minPrice=20',
    '?maxPrice=60&priceCurrency=usd',
    '?priceCurrency=thb',
    '?sort=price-asc',
    '?sort=newest&utm_source=x',
    '?utm_source=x&color=black',
    '?Color=black&color=black',
  ])('holds for a catalogue filter: %s', (search) => {
    runHoldScript(search);

    expect(document.getElementById(HOLD_STYLE_ID)).not.toBeNull();
  });

  it.each([
    '?utm_source=newsletter',
    '?utm_source=x&utm_medium=email&utm_campaign=autumn',
    '?fbclid=IwAR0abc',
    '?gclid=Cj0KCQ',
    '?ref=home',
    '?sort=featured',
    '?sort=featured&fbclid=x',
    '?colour=black',
    '?x',
    '?',
  ])('does not hold for %s: nothing will change, so the grid must paint at once', (search) => {
    runHoldScript(search);

    expect(document.getElementById(HOLD_STYLE_ID)).toBeNull();
  });

  it('keeps its variables out of the global scope', () => {
    runHoldScript('?color=black');

    expect(Object.keys(globalThis)).not.toEqual(expect.arrayContaining(['p', 'h', 's']));
  });

  it('knows every parameter the parser reads, so a new filter cannot be forgotten', () => {
    const read = new Set<string>();
    const spy = new Proxy({} as Record<string, string | undefined>, {
      get: (_target, key) => {
        if (typeof key === 'string') read.add(key);
        return undefined;
      },
    });

    parseQueryParams(spy, 'USD', new Set());

    expect([...read].toSorted()).toEqual([...HOLD_KEYS, 'sort'].toSorted());
  });

  it('hides the results area, keeping its layout, when the URL has a query string', () => {
    runHoldScript('?color=black');

    const style = document.getElementById(HOLD_STYLE_ID);
    expect(style?.tagName).toBe('STYLE');
    expect(style?.parentElement).toBe(document.head);
    expect(style?.textContent).toBe(`[${HOLD_ATTRIBUTE}]{visibility:hidden}`);
  });

  it('adds the style once even if the script runs twice', () => {
    runHoldScript('?color=black');
    runHoldScript('?color=black');

    expect(document.querySelectorAll(`#${HOLD_STYLE_ID}`)).toHaveLength(1);
  });

  it('lets go by itself, so a failed script bundle never leaves the grid hidden', () => {
    runHoldScript('?color=black');

    vi.advanceTimersByTime(HOLD_TIMEOUT_MS - 1);
    expect(document.getElementById(HOLD_STYLE_ID)).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(document.getElementById(HOLD_STYLE_ID)).toBeNull();
  });

  it('stays inert to the CSP-relevant rules: no network, no eval, no dangerous markup', () => {
    expect(HOLD_SCRIPT).not.toMatch(/fetch|XMLHttpRequest|eval|innerHTML|<\/?script/i);
    expect(HOLD_SCRIPT.length).toBeLessThan(600);
  });
});
