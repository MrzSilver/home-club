import type { ReactElement } from 'react';

import { Container } from '@/components/ui/container';

// TEMPORARY (T01/T02): placeholder so the toolchain has something to build and test.
// T03 moves the home page to src/app/[locale]/page.tsx.
export default function HomePage(): ReactElement {
  return (
    <main id="main">
      <Container className="py-section">
        <p className="text-eyebrow uppercase-latin text-muted">Demo store</p>
        <h1 className="mt-2 text-display uppercase-latin">Home Club Foundation</h1>
        <p className="mt-4 max-w-prose text-body text-muted">
          Demo store scaffold. Nothing is sold here.
        </p>
      </Container>
    </main>
  );
}
