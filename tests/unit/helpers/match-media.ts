import { vi } from 'vitest';

type Listener = (event: MediaQueryListEvent) => void;

/**
 * jsdom has no `matchMedia`. Installs one that answers `prefers-reduced-motion: reduce` with
 * `reduced` and lets a test flip the preference later, notifying subscribers like a browser does.
 */
export function mockMatchMedia(reduced = false): { setReduced: (value: boolean) => void } {
  let current = reduced;
  const listeners = new Set<Listener>();

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches(): boolean {
        return query.includes('prefers-reduced-motion') ? current : false;
      },
      media: query,
      addEventListener: (_type: string, listener: Listener): void => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: Listener): void => {
        listeners.delete(listener);
      },
    })),
  );

  return {
    setReduced(value: boolean): void {
      current = value;
      for (const listener of listeners) listener({ matches: value } as MediaQueryListEvent);
    },
  };
}
