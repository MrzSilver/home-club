'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';

import { useRouter } from '@/i18n/navigation';
import { readCurrencyCookie, segmentToCurrency } from '@/lib/currency';

/**
 * Keeps the page's prices in step with the currency cookie after a history navigation. The browser
 * may restore a page from its HTTP cache or the back/forward cache with the currency the page had
 * when it was left, while the cookie has changed since (the visitor switched currency, went away
 * with a full-document navigation, then pressed Back). On mount and on `pageshow` the cookie is
 * compared with the page's `[currency]` segment, and a mismatch refreshes the route so the proxy
 * serves the right prerendered variant (ADR-0003). Renders nothing. A missing cookie means the
 * locale default, which is what the page already shows, so nothing is refreshed.
 */
export function CurrencySync(): null {
  const params = useParams<{ currency?: string }>();
  const router = useRouter();
  const pageCurrency = segmentToCurrency(params.currency);

  useEffect(() => {
    function sync(): void {
      const wanted = readCurrencyCookie(document.cookie);
      if (wanted !== null && pageCurrency !== null && wanted !== pageCurrency) router.refresh();
    }
    sync();
    window.addEventListener('pageshow', sync);
    return () => window.removeEventListener('pageshow', sync);
  }, [pageCurrency, router]);

  return null;
}
