// Lighthouse CI: budgets from SPEC 12, run against the production build (`pnpm build` first).
// Chrome is located via the CHROME_PATH environment variable when set (see README);
// otherwise chrome-launcher falls back to a system-installed Chrome/Chromium.
const BASE_URL = 'http://localhost:3000';

// Routes under test. The home route is `/` while the scaffold has no locale routing;
// T03 changes it to `/en`, and later tasks add the Collection and Product pages.
const ROUTES = ['/'];

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm start',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 60000,
      url: ROUTES.map((route) => `${BASE_URL}${route}`),
      numberOfRuns: 3,
      settings: {
        // Lighthouse's default is the mobile preset (Moto G Power emulation, slow 4G throttling).
        formFactor: 'mobile',
        // The sandbox cannot start inside containers / as root; only localhost is loaded.
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    assert: {
      // Judge the median of the runs, not the best one (the default "optimistic" lets 2 of 3
      // over-budget runs pass). Budgets are release gates (RULES 9.1).
      aggregationMethod: 'median-run',
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
