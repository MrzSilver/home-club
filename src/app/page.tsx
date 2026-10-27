import type { ReactElement } from 'react';

// TEMPORARY (T01): placeholder so the toolchain has something to build and test.
// T03 moves the home page to src/app/[locale]/page.tsx.
export default function HomePage(): ReactElement {
  return (
    <main>
      <h1>Home Club Foundation</h1>
      <p>Demo store scaffold. Nothing is sold here.</p>
    </main>
  );
}
