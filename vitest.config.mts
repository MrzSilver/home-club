import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    restoreMocks: true,
    coverage: {
      // Thresholds only apply to `pnpm test:coverage`; plain `pnpm test` never fails on them.
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
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
