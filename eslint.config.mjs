import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// RULES 3.8: absolute `@/` imports, no deep relative chains.
const DEEP_RELATIVE = {
  regex: '^(\\.\\./){2,}',
  message: 'Use the "@/" alias instead of deep relative imports (RULES 3.8).',
};

// SPEC 4: navigation helpers come from "@/i18n/navigation" so every link and redirect carries the
// locale prefix. Flat config replaces `no-restricted-imports` options block by block, so every block
// that sets the rule must spread these in as well.
const I18N_NAVIGATION_PATHS = [
  {
    name: 'next/link',
    message: 'Import Link from "@/i18n/navigation" so the locale prefix is added (SPEC 4).',
  },
  {
    name: 'next/navigation',
    importNames: ['redirect', 'permanentRedirect', 'usePathname', 'useRouter', 'Link'],
    message:
      'Import redirect, permanentRedirect, usePathname and useRouter from "@/i18n/navigation" so the locale prefix is handled (SPEC 4). notFound and useSearchParams may still come from "next/navigation".',
  },
  {
    name: 'next-intl/navigation',
    message:
      'Import from "@/i18n/navigation": its usePathname also strips the hidden currency segment, which next-intl\'s own does not (ADR-0003).',
  },
];

// Files where Next.js (or a tool) requires a default export (RULES 2.5).
const DEFAULT_EXPORT_ALLOWED = [
  'src/app/**/{page,layout,not-found,error,loading,template,default,global-error}.{ts,tsx}',
  'src/app/**/{opengraph-image,twitter-image,icon,apple-icon,sitemap,robots,manifest}.{ts,tsx}',
  'src/app/**/route.{ts,tsx}',
  '*.config.{ts,mts,mjs,cjs,js}',
  'proxy.ts',
  'src/proxy.ts',
  'src/i18n/request.ts',
];

// Warnings are ignored in CI logs; make every rule shipped by eslint-config-next blocking.
const isWarn = (level) => level === 'warn' || level === 1;
const promoteWarnings = (configs) =>
  configs.map((config) => {
    if (!config.rules) return config;
    const rules = Object.fromEntries(
      Object.entries(config.rules).map(([name, setting]) => {
        if (Array.isArray(setting) && isWarn(setting[0]))
          return [name, ['error', ...setting.slice(1)]];
        return [name, isWarn(setting) ? 'error' : setting];
      }),
    );
    return { ...config, rules };
  });

const eslintConfig = defineConfig([
  ...promoteWarnings(nextVitals),
  ...promoteWarnings(nextTs),

  {
    // eslint-config-next already registers the jsx-a11y plugin (as a distinct object, so
    // re-using the plugin's own flat config would throw "Cannot redefine plugin"). Take the
    // strict rule set from the plugin and apply it on top.
    name: 'home-club/jsx-a11y-strict',
    files: ['**/*.{jsx,tsx}'],
    rules: jsxA11y.flatConfigs.strict.rules,
  },

  {
    // Core rules: no plugin needed, so they also cover plain .cjs config files.
    name: 'home-club/core-rules',
    rules: {
      // RULES 3.6
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        { paths: I18N_NAVIGATION_PATHS, patterns: [DEEP_RELATIVE] },
      ],
    },
  },

  {
    // eslint-config-next registers the typescript-eslint plugin for TS files only.
    name: 'home-club/typescript-rules',
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      // RULES 2.2
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
    },
  },

  {
    // RULES 2.4: exhaustive switches. This rule needs type information, so it is scoped to the
    // TypeScript sources and tests (the config files are plain JS and are not type-checked).
    name: 'home-club/switch-exhaustiveness',
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true } },
    rules: { '@typescript-eslint/switch-exhaustiveness-check': 'error' },
  },

  {
    // eslint-config-next registers the import plugin for these extensions only (not .cjs).
    name: 'home-club/import-rules',
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts}'],
    rules: {
      // RULES 2.5 (default exports only where Next.js needs them, see override below)
      'import/no-default-export': 'error',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'error',
      'import/newline-after-import': 'error',
      // Layering is checked on resolved paths, so "../app/x" and "@/app/x" are both caught
      // (the no-restricted-imports patterns below only see the specifier text).
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/components',
              from: './src/app',
              message: 'components/ must not import from app/ (RULES 3.8).',
            },
            {
              target: './src/lib',
              from: ['./src/app', './src/components', './src/store'],
              message: 'src/lib must not depend on app/, components/ or store/ (SPEC 3).',
            },
          ],
        },
      ],
    },
  },

  {
    // RULES 10.3: dangerouslySetInnerHTML is only allowed in the shared, escaping JSON-LD helper.
    // That helper must live at src/components/seo/json-ld.tsx (lib/ cannot hold JSX); it is built
    // in the SEO task and is the single exception below.
    name: 'home-club/no-danger',
    files: ['**/*.{jsx,tsx}'],
    rules: { 'react/no-danger': 'error' },
  },

  {
    name: 'home-club/json-ld-helper',
    files: ['src/components/seo/json-ld.tsx'],
    rules: { 'react/no-danger': 'off' },
  },

  {
    // RULES 6.1: no hard-coded user-visible text in components. The rule sees JSX text only, which is
    // the common slip; string attributes (aria-label, alt, title) cannot be told apart from className
    // and data-* values without a flood of false positives, so those stay a review item. Tests are
    // excluded because their fixtures are literal by design. Punctuation separators are allowed.
    name: 'home-club/no-hard-coded-text',
    files: ['src/**/*.tsx'],
    rules: {
      'react/jsx-no-literals': [
        'error',
        { noStrings: false, allowedStrings: ['·', '•', '/', '|', '–', '—'] },
      ],
    },
  },

  {
    // RULES 2.5: explicit return types on exported functions.
    name: 'home-club/explicit-return-types',
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': [
        'error',
        { allowArgumentsExplicitlyTypedAsAny: false },
      ],
    },
  },

  {
    name: 'home-club/default-export-allowed',
    files: DEFAULT_EXPORT_ALLOWED,
    rules: { 'import/no-default-export': 'off' },
  },

  {
    // RULES 3.8: components never import from app/.
    name: 'home-club/components-layering',
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: I18N_NAVIGATION_PATHS,
          patterns: [
            DEEP_RELATIVE,
            {
              group: ['@/app', '@/app/*', '@/app/**'],
              message: 'components/ must not import from app/ (RULES 3.8).',
            },
          ],
        },
      ],
    },
  },

  {
    // RULES 3.4: lib/ is pure - no React, no Next.js, no browser globals.
    name: 'home-club/lib-purity',
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            DEEP_RELATIVE,
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'next',
                'next/*',
                'next-intl',
                'next-intl/*',
              ],
              message:
                'src/lib must stay framework-free: no React, Next.js or next-intl imports (RULES 3.4).',
            },
            {
              group: [
                'node:*',
                'fs',
                'fs/*',
                'child_process',
                'net',
                'http',
                'https',
                'dns',
                'worker_threads',
              ],
              message: 'src/lib must not perform I/O: no Node built-in modules (RULES 3.4).',
            },
            {
              group: [
                '@/app',
                '@/app/**',
                '@/components',
                '@/components/**',
                '@/store',
                '@/store/**',
              ],
              message: 'src/lib must not depend on app/, components/ or store/ (SPEC 3).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'fetch'].map(
          (name) => ({
            name,
            message: 'src/lib must not use browser APIs or perform network I/O (RULES 3.4).',
          }),
        ),
      ],
    },
  },

  {
    // Test files may use non-null-free helpers freely but still follow the shared rules;
    // only the app-specific return-type rule is skipped (scoped above to src/**).
    name: 'home-club/tests',
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: I18N_NAVIGATION_PATHS, patterns: [DEEP_RELATIVE] },
      ],
    },
  },

  {
    // The 404 page renders outside any locale layout, so there is no locale context for the i18n Link;
    // it links to "/en" and "/th" explicitly. Only the navigation rules are lifted.
    name: 'home-club/root-not-found',
    files: ['src/app/not-found.tsx'],
    rules: { 'no-restricted-imports': ['error', { patterns: [DEEP_RELATIVE] }] },
  },

  {
    // The one module that wraps next-intl's navigation helpers (so it may import them directly).
    name: 'home-club/i18n-navigation',
    files: ['src/i18n/navigation.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [DEEP_RELATIVE] }] },
  },

  prettier,

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '.lighthouseci/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
