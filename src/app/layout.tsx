import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';

import { SkipLink } from '@/components/ui/skip-link';
import { env } from '@/lib/env';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

// TEMPORARY (T01/T02): hard-coded copy and a single root layout. T03 replaces this with
// src/app/[locale]/layout.tsx, translated strings (including the skip-link label) and per-locale
// metadata. Moving it keeps three things: the font variables on <html>, the SkipLink before the
// page content, and <main id="main"> in the page.
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: 'Home Club Foundation (demo)',
  description: 'Home Club Foundation is a demo online clothing store. Nothing is sold.',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <SkipLink label="Skip to content" />
        {children}
      </body>
    </html>
  );
}
