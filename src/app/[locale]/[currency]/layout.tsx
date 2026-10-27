import type { ReactElement, ReactNode } from 'react';

import { currencyFromParam } from '@/i18n/params';
import { CURRENCY_SEGMENTS } from '@/lib/currency';

type CurrencyLayoutProps = {
  children: ReactNode;
  params: Promise<{ currency: string }>;
};

// The hidden currency segment (docs/adr/0003-currency-segment.md). The proxy adds it to every public
// URL, so visitors never type it; this layout only rejects values the proxy would not produce.
// It adds no markup and no metadata of its own: the locale layout and each page own both.
export const dynamicParams = false;

export function generateStaticParams(): { currency: string }[] {
  return CURRENCY_SEGMENTS.map((currency) => ({ currency }));
}

export default async function CurrencyLayout({
  children,
  params,
}: CurrencyLayoutProps): Promise<ReactElement> {
  currencyFromParam((await params).currency);
  return <>{children}</>;
}
