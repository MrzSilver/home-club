import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Container } from '@/components/ui/container';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

// The 404 for every URL no page answers, in both languages (docs/adr/0003-currency-segment.md).
// Next.js serves this file, fully server-rendered, for unknown URLs because the dynamic segments set
// `dynamicParams = false`. It cannot know the visitor's language, so it shows both: the English block
// and the Thai block each carry their own `lang`, and `<html lang>` is the default locale. It works
// without JavaScript. Next.js adds `noindex` and the 404 status.
export const metadata: Metadata = {
  title: { absolute: `${en.seo.notFoundTitle} / ${th.seo.notFoundTitle}` },
};

export default function RootNotFound(): ReactElement {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <main id="main">
          <Container className="py-section">
            <section lang="en">
              <h1 className="text-h1 uppercase-latin">{en.notFound.title}</h1>
              <p className="mt-4 max-w-prose text-body text-muted">{en.notFound.body}</p>
              <p className="mt-6">
                <Link href="/en" className="text-body underline underline-offset-4">
                  {en.notFound.backHome}
                </Link>
              </p>
            </section>
            <section lang="th" className="mt-12">
              <h2 className="text-h2">{th.notFound.title}</h2>
              <p className="mt-4 max-w-prose text-body text-muted">{th.notFound.body}</p>
              <p className="mt-6">
                <Link href="/th" className="text-body underline underline-offset-4">
                  {th.notFound.backHome}
                </Link>
              </p>
            </section>
          </Container>
        </main>
      </body>
    </html>
  );
}
