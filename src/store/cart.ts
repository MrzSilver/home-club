import { createStore, type Mutate, type StoreApi } from 'zustand/vanilla';
import { persist, type PersistStorage } from 'zustand/middleware';
import type { CartLine } from '@/data/schema';
import {
  addCartLine,
  addCartLinesAtomically,
  normalizeCart,
  setCartLineQty,
  type StockIndex,
} from '@/lib/cart';

export type CartState = {
  lines: CartLine[];
  hydrated: boolean;
  add: (sku: string, qty: number) => boolean;
  addMany: (lines: readonly CartLine[]) => boolean;
  setQty: (sku: string, qty: number, lookId?: string) => void;
  remove: (sku: string, lookId?: string) => void;
  clear: () => void;
};
type SavedCart = { lines: CartLine[] };

// Access, JSON decoding and writes can all fail (private browsing, corrupt data, full storage).
export function browserCartStorage(stock: StockIndex = {}): PersistStorage<SavedCart> {
  return {
    getItem: async (name) => {
      try {
        const raw = localStorage.getItem(name);
        if (raw === null) return null;
        // Empty carts need no validation code on first load. Persisted data is still validated
        // before it can reach the store or the badge.
        const { parseSavedCart } = await import('@/lib/cart-schema');
        const parsed = parseSavedCart(JSON.parse(raw));
        return parsed === null
          ? null
          : { ...parsed, state: { lines: normalizeCart(parsed.state.lines, stock) } };
      } catch {
        return null;
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
        add: (sku, qty) => {
          if (
            !get().hydrated ||
            !Object.hasOwn(stock, sku) ||
            (stock[sku] ?? 0) < 1 ||
            !Number.isSafeInteger(qty) ||
            qty < 1
          )
            return false;
          set({ lines: addCartLine(get().lines, sku, qty, stock) });
          return true;
        },
        addMany: (additions) => {
          if (!get().hydrated) return false;
          const lines = addCartLinesAtomically(get().lines, additions, stock);
          if (lines === null) return false;
          set({ lines });
          return true;
        },
        setQty: (sku, qty, lookId) =>
          set({
            lines: setCartLineQty(get().lines, sku, qty, stock, lookId),
          }),
        remove: (sku, lookId) =>
          set({ lines: get().lines.filter((line) => line.sku !== sku || line.lookId !== lookId) }),
        clear: () => set({ lines: [] }),
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
