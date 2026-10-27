import type { ReactNode } from 'react';

// Pass-through root layout. `<html>` belongs to src/app/[locale]/layout.tsx because its `lang` depends
// on the locale; this file exists so that src/app/not-found.tsx (URLs outside any locale) is valid.
export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return children;
}
