'use client';

import { useEffect, type ReactElement } from 'react';

import { ErrorPanel } from '@/components/layout/error-panel';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Route error boundary (SPEC 13a): a render error inside a locale keeps the header and footer and
// shows a localized recovery screen. Imported eagerly on purpose: a lazy panel would fail to load
// exactly when the error is a ChunkLoadError after a deploy. The error and digest are logged,
// never shown.
export default function LocaleError({ error, reset }: ErrorPageProps): ReactElement {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorPanel reset={reset} />;
}
