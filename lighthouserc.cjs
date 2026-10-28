// Lighthouse CI: budgets from SPEC 12. Where the gates run is ADR-0004 "Amendment: where the Lighthouse
// gates run".
//
//  - LHCI_BASE_URL set (the lighthouse-preview workflow, or a person pointing at a deployment): no local
//    server, the routes are loaded from that base and EVERY assertion is an error. This is the real
//    release gate for performance score, LCP and TBT.
//  - LHCI_BASE_URL unset (sandbox, local, the verify job in CI): `pnpm start` serves the production
//    build. Accessibility, best-practices and SEO scores and CLS are deterministic and stay errors;
//    performance score, LCP and TBT depend on the machine (a 2-vCPU sandbox simulates mobile LCP
//    1.2-3.3 s for identical builds), so they are warnings there: informational, never a gate.
//
// Chrome is located via the CHROME_PATH environment variable when set (see README); otherwise
// chrome-launcher falls back to a system-installed Chrome/Chromium.
const LOCAL_URL = 'http://localhost:3000';
const remote = (process.env.LHCI_BASE_URL ?? '').trim().replace(/\/+$/, '');
const BASE_URL = remote === '' ? LOCAL_URL : remote;

// Routes under test: every page in both locales (RULES 8.8 and SPEC 12 apply to Thai too).
// Later tasks add the Collection, Product and Look builder pages.
const ROUTES = ['/en', '/th'];

// Machine-dependent metrics: errors against a deployment, warnings against the local server.
const machineLevel = remote === '' ? 'warn' : 'error';

module.exports = {
  ci: {
    collect: {
      ...(remote === ''
        ? {
            startServerCommand: 'pnpm start',
            startServerReadyPattern: 'Ready',
            startServerReadyTimeout: 60000,
          }
        : {}),
      url: ROUTES.map((route) => `${BASE_URL}${route}`),
      numberOfRuns: 5,
      settings: {
        // Lighthouse's default is the mobile preset (Moto G Power emulation, slow 4G throttling).
        formFactor: 'mobile',
        // The sandbox cannot start inside containers / as root.
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    assert: {
      // Judge the median of each metric across runs (ADR-0004). Not "optimistic" (the default lets
      // 2 of 3 over-budget runs pass) and not "median-run" (one noisy run decides every metric).
      aggregationMethod: 'median',
      assertions: {
        'categories:performance': [machineLevel, { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': [machineLevel, { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': [machineLevel, { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
