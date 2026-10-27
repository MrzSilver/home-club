import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    // next-intl's ESM build imports "next/server" without the .js extension, which plain Node cannot
    // resolve. Inlining it lets Vite resolve those imports the way Next.js's bundler does.
    server: { deps: { inline: ['next-intl'] } },
    restoreMocks: true,
    coverage: {
      // Thresholds only apply to `pnpm test:coverage`; plain `pnpm test` never fails on them.
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        // next/font calls are compiled away by Next.js and cannot run in Vitest; tests/e2e/base-styles.spec.ts
        // checks the loaded fonts in a real browser.
        'src/styles/fonts.ts',
        // Next.js route boundary files are exercised by the Playwright suite, not by Vitest.
        'src/app/**/{layout,not-found,error,global-error,loading,template,default}.tsx',
        'src/app/**/{opengraph-image,twitter-image,icon,apple-icon,sitemap,robots,manifest}.{ts,tsx}',
      ],
      reporter: ['text-summary', 'text', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 75,
        'src/lib/**': { lines: 90 },
      },
    },
  },
});
