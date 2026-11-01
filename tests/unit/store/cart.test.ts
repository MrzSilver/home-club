import { beforeEach, describe, expect, it } from 'vitest';
import { createCartStore, browserCartStorage } from '@/store/cart';

const stock = { tee: 3, cap: 20, sold: 0 };
beforeEach(() => localStorage.clear());
describe('persisted cart store (FR-050, FR-051)', () => {
  it('rehydrates only explicitly, clamps additions/changes and persists only SKU/qty', async () => {
    const store = createCartStore(stock);
    expect(store.getState().add('tee', 2)).toBe(false);
    await store.persist.rehydrate();
    store.setState({ hydrated: true });
    expect(store.getState().add('tee', 2)).toBe(true);
    store.getState().add('tee', 8);
    store.getState().add('cap', 12);
    expect(store.getState().lines).toEqual([
      { sku: 'tee', qty: 3 },
      { sku: 'cap', qty: 10 },
    ]);
    store.getState().setQty('tee', 99);
    store.getState().setQty('cap', 2);
    const restored = createCartStore({ ...stock, tee: 1 });
    await restored.persist.rehydrate();
    expect(restored.getState().lines).toEqual([
      { sku: 'tee', qty: 1 },
      { sku: 'cap', qty: 2 },
    ]);
    expect(JSON.parse(localStorage.getItem('hc:cart:v1') ?? '{}')).toEqual({
      state: {
        lines: [
          { sku: 'tee', qty: 3 },
          { sku: 'cap', qty: 2 },
        ],
      },
      version: 1,
    });
    store.getState().remove('tee');
    expect(store.getState().lines).toEqual([{ sku: 'cap', qty: 2 }]);
    store.getState().clear();
    expect(store.getState().lines).toEqual([]);
  });
  it.each([
    'garbage',
    '{"version":"999","state":{"lines":[{"sku":"tee","qty":2}]}}',
    '{"state":{"lines":[{"sku":"tee","qty":2}]}}',
    'null',
    '{}',
    '{"version":1,"state":{"lines":[{"sku":"tee","qty":2,"price":1}]}}',
    '{"version":999,"state":{"lines":[{"sku":"tee","qty":2}]}}',
  ])('recovers safely from corrupt or unsupported storage: %s', async (value) => {
    localStorage.setItem('hc:cart:v1', value);
    const store = createCartStore(stock);
    await store.persist.rehydrate();
    expect(store.getState().lines).toEqual([]);
  });
  describe('recovery notice (FR-051)', () => {
    const hydrate = async (raw: string | null, index = stock) => {
      if (raw !== null) localStorage.setItem('hc:cart:v1', raw);
      const store = createCartStore(index);
      await store.persist.rehydrate();
      store.setState({ hydrated: true });
      return store;
    };
    const saved = (lines: unknown[]) => JSON.stringify({ state: { lines }, version: 1 });

    it.each([
      ['corrupt JSON', 'garbage'],
      ['an unsupported version', '{"version":999,"state":{"lines":[{"sku":"tee","qty":2}]}}'],
      ['an extra field', '{"version":1,"state":{"lines":[{"sku":"tee","qty":2,"price":1}]}}'],
      ['a malformed line', saved([{ sku: 'tee', qty: 'two' }])],
    ])('reports reset for %s (FR-051)', async (_name, raw) => {
      const store = await hydrate(raw);
      expect(store.getState().recovery).toBe('reset');
      expect(store.getState().lines).toEqual([]);
    });

    it.each([
      [
        'an unknown SKU',
        saved([
          { sku: 'gone', qty: 1 },
          { sku: 'cap', qty: 1 },
        ]),
        1,
      ],
      ['a quantity above stock', saved([{ sku: 'tee', qty: 5 }]), 1],
      ['a sold-out line', saved([{ sku: 'sold', qty: 1 }]), 0],
      [
        'merged duplicate lines',
        saved([
          { sku: 'cap', qty: 1 },
          { sku: 'cap', qty: 2 },
        ]),
        1,
      ],
    ])('reports adjusted for %s (FR-051)', async (_name, raw, remaining) => {
      const store = await hydrate(raw);
      expect(store.getState().recovery).toBe('adjusted');
      expect(store.getState().lines).toHaveLength(remaining);
    });

    it('reports nothing for a valid cart and for empty storage (FR-051)', async () => {
      const valid = await hydrate(saved([{ sku: 'tee', qty: 2 }]));
      expect(valid.getState().recovery).toBeNull();
      expect(valid.getState().lines).toEqual([{ sku: 'tee', qty: 2 }]);
      localStorage.clear();
      expect((await hydrate(null)).getState().recovery).toBeNull();
    });

    it('does not treat unavailable storage as a reset (FR-051)', async () => {
      const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => {
          throw new Error('blocked');
        },
      });
      try {
        expect((await hydrate(null)).getState().recovery).toBeNull();
      } finally {
        if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
      }
    });

    it('never writes the recovery flag to localStorage (FR-051)', async () => {
      const store = await hydrate(saved([{ sku: 'tee', qty: 5 }]));
      expect(store.getState().recovery).toBe('adjusted');
      store.getState().add('cap', 1);
      expect(localStorage.getItem('hc:cart:v1')).not.toContain('recovery');
      const reset = await hydrate('garbage');
      reset.getState().dismissRecovery();
      expect(localStorage.getItem('hc:cart:v1') ?? '').not.toContain('recovery');
    });

    it('clears the flag on dismiss (FR-051)', async () => {
      const store = await hydrate('garbage');
      store.getState().dismissRecovery();
      expect(store.getState().recovery).toBeNull();
    });

    it.each([
      ['add', (s: Awaited<ReturnType<typeof hydrate>>) => s.getState().add('cap', 1)],
      [
        'addMany',
        (s: Awaited<ReturnType<typeof hydrate>>) => s.getState().addMany([{ sku: 'cap', qty: 1 }]),
      ],
      ['setQty', (s: Awaited<ReturnType<typeof hydrate>>) => s.getState().setQty('cap', 2)],
      ['remove', (s: Awaited<ReturnType<typeof hydrate>>) => s.getState().remove('cap')],
      ['clear', (s: Awaited<ReturnType<typeof hydrate>>) => s.getState().clear()],
    ])('clears the flag on the next %s (FR-051)', async (_name, act) => {
      const store = await hydrate(
        saved([
          { sku: 'gone', qty: 1 },
          { sku: 'cap', qty: 1 },
        ]),
      );
      expect(store.getState().recovery).toBe('adjusted');
      act(store);
      expect(store.getState().recovery).toBeNull();
    });
  });
  it('rejects invalid adds and keeps current lines', async () => {
    const store = createCartStore(stock);
    await store.persist.rehydrate();
    store.setState({ hydrated: true });
    for (const [sku, qty] of [
      ['sold', 1],
      ['unknown', 1],
      ['tee', 0],
      ['tee', 1.5],
      ['__proto__', 1],
    ] as const)
      expect(store.getState().add(sku, qty)).toBe(false);
    expect(store.getState().lines).toEqual([]);
  });
  it('continues in memory when storage is unavailable', async () => {
    const storage = browserCartStorage();
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('blocked');
      },
    });
    try {
      expect(await storage.getItem('hc:cart:v1')).toBeNull();
      expect(() =>
        storage.setItem('hc:cart:v1', { state: { lines: [] }, version: 1 }),
      ).not.toThrow();
      expect(() => storage.removeItem('hc:cart:v1')).not.toThrow();
      const store = createCartStore(stock, storage);
      await store.persist.rehydrate();
      store.setState({ hydrated: true });
      expect(store.getState().add('tee', 1)).toBe(true);
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
    }
  });
});
