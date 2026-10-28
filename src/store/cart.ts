import { createStore, type Mutate, type StoreApi } from 'zustand/vanilla';
import { persist, type PersistStorage } from 'zustand/middleware';
import type { CartLine } from '@/data/schema';
import { addCartLine, normalizeCart, type StockIndex } from '@/lib/cart';

export type CartState = {
  lines: CartLine[];
  hydrated: boolean;
  add: (sku: string, qty: number) => boolean;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
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
        setQty: (sku, qty) =>
          set({
            lines: normalizeCart(
              get().lines.map((line) =>
                line.sku === sku
                  ? { sku, qty: Number.isFinite(qty) ? Math.max(1, Math.trunc(qty)) : 1 }
                  : line,
              ),
              stock,
            ),
          }),
        remove: (sku) => set({ lines: get().lines.filter((line) => line.sku !== sku) }),
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
