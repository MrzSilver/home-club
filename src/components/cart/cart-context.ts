'use client';
import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { Locale, Product } from '@/data/schema';
import type { CartStore, CartState } from '@/store/cart';

export type CartProduct = Pick<
  Product,
  'slug' | 'name' | 'priceCents' | 'colors' | 'variants' | 'images'
>;
export type CartContextValue = {
  store: CartStore;
  products: CartProduct[];
  locale: Locale;
  openCart: (trigger?: HTMLElement | null) => void;
};
export const CartContext = createContext<CartContextValue | null>(null);
export function useCartContext(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) throw new Error('CartProvider is required');
  return context;
}
export function useCart<T>(selector: (state: CartState) => T): T {
  return useStore(useCartContext().store, selector);
}
