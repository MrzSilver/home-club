import { createStore, type Mutate, type StoreApi } from 'zustand/vanilla';
import { persist, type PersistStorage } from 'zustand/middleware';
import type { CartLine } from '@/data/schema';
import {
  addCartLine,
  addCartLinesAtomically,
  reconcileCart,
  setCartLineQty,
  type StockIndex,
} from '@/lib/cart';

/** Transient, in-memory notice about what hydration had to repair. Never persisted. */
export type CartRecovery = 'reset' | 'adjusted';

export type CartState = {
  lines: CartLine[];
  hydrated: boolean;
  recovery: CartRecovery | null;
  add: (sku: string, qty: number) => boolean;
  addMany: (lines: readonly CartLine[]) => boolean;
  setQty: (sku: string, qty: number, lookId?: string) => void;
  remove: (sku: string, lookId?: string) => void;
  clear: () => void;
  dismissRecovery: () => void;
};
// `recovery` only travels from storage.getItem into the store; partialize never writes it back.
type SavedCart = { lines: CartLine[]; recovery?: CartRecovery };

// Access, JSON decoding and writes can all fail (private browsing, corrupt data, full storage).
export function browserCartStorage(stock: StockIndex = {}): PersistStorage<SavedCart> {
  return {
    getItem: async (name) => {
      // Unavailable storage is not corrupt data: carry on silently with an empty cart.
      let raw: string | null;
      try {
        raw = localStorage.getItem(name);
      } catch {
        return null;
      }
      if (raw === null) return null;
      try {
        // Empty carts need no validation code on first load. Persisted data is still validated
        // before it can reach the store or the badge.
        const { parseSavedCart } = await import('@/lib/cart-schema');
        const parsed = parseSavedCart(JSON.parse(raw));
        if (parsed === null) return { state: { lines: [], recovery: 'reset' }, version: 1 };
        const { lines, changed } = reconcileCart(parsed.state.lines, stock);
        return {
          ...parsed,
          state: { lines, ...(changed ? { recovery: 'adjusted' as const } : {}) },
        };
      } catch {
        return { state: { lines: [], recovery: 'reset' }, version: 1 };
      }
    },
    setItem: (name, value) => {
      try {
        if (value.state.lines.length === 0) localStorage.removeItem(name);
        else localStorage.setItem(name, JSON.stringify(value));
      } catch {
        /* Continue in memory. */
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch {
        /* Continue in memory. */
      }
    },
  };
}

export type CartStore = Mutate<StoreApi<CartState>, [['zustand/persist', SavedCart]]>;

export function createCartStore(stock: StockIndex, storage = browserCartStorage(stock)): CartStore {
  return createStore<CartState>()(
    persist(
      (set, get) => ({
        lines: [],
        hydrated: false,
        recovery: null,
        add: (sku, qty) => {
          if (
            !get().hydrated ||
            !Object.hasOwn(stock, sku) ||
            (stock[sku] ?? 0) < 1 ||
            !Number.isSafeInteger(qty) ||
            qty < 1
          )
            return false;
          set({ lines: addCartLine(get().lines, sku, qty, stock), recovery: null });
          return true;
        },
        addMany: (additions) => {
          if (!get().hydrated) return false;
          const lines = addCartLinesAtomically(get().lines, additions, stock);
          if (lines === null) return false;
          set({ lines, recovery: null });
          return true;
        },
        setQty: (sku, qty, lookId) =>
          set({
            lines: setCartLineQty(get().lines, sku, qty, stock, lookId),
            recovery: null,
          }),
        remove: (sku, lookId) =>
          set({
            lines: get().lines.filter((line) => line.sku !== sku || line.lookId !== lookId),
            recovery: null,
          }),
        clear: () => set({ lines: [], recovery: null }),
        dismissRecovery: () => set({ recovery: null }),
      }),
      {
        name: 'hc:cart:v1',
        version: 1,
        storage,
        skipHydration: true,
        partialize: (state) => ({ lines: state.lines }),
        migrate: () => ({ lines: [] }),
      },
    ),
  );
}
