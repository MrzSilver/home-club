'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { Locale, Look } from '@/data/schema';
import { createCartStore } from '@/store/cart';
import { CartContext, type CartProduct } from '@/components/cart/cart-context';

const CartDrawer = dynamic(() => import('./cart-drawer').then((module) => module.CartDrawer), {
  ssr: false,
});

export function CartProvider({
  products,
  locale,
  looks = [],
  children,
}: {
  products: CartProduct[];
  locale: Locale;
  looks?: readonly Look[];
  children: ReactNode;
}): ReactElement {
  const [store] = useState(() =>
    createCartStore(
      Object.fromEntries(
        products.flatMap((product) =>
          product.variants.map((variant) => [variant.sku, variant.stock]),
        ),
      ),
    ),
  );
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    void Promise.resolve(store.persist.rehydrate()).finally(() =>
      store.setState({ hydrated: true }),
    );
  }, [store]);
  const openCart = (trigger?: HTMLElement | null): void => {
    returnFocusRef.current =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setLoaded(true);
    setOpen(true);
  };
  return (
    <CartContext value={{ store, products, looks, locale, openCart }}>
      {children}
      {loaded ? (
        <CartDrawer open={open} onOpenChange={setOpen} returnFocusRef={returnFocusRef} />
      ) : null}
    </CartContext>
  );
}
