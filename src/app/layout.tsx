import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';

import { env } from '@/lib/env';
import '@/styles/globals.css';

// TEMPORARY (T01): hard-coded copy and a single root layout. T03 replaces this
// with src/app/[locale]/layout.tsx, translated strings and per-locale metadata.
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: 'Home Club Foundation (demo)',
  description: 'Home Club Foundation is a demo online clothing store. Nothing is sold.',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
