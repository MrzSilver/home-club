import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { reachableModules, runtimeSpecifiers, whyReachable } from '../helpers/import-graph';

const ROOT = process.cwd();

// Files the browser must be able to load without the seed catalogue or Zod (ADR-0006): the collection
// island and the drawer, plus everything they import at run time (the drawer is loaded with a dynamic
// import, which the walker follows from `use-filter-drawer.ts` as well).
const ENTRIES = [
  'src/components/catalogue/catalogue-explorer.tsx',
  'src/components/catalogue/filter-drawer.tsx',
];

// Modules that would drag the catalogue data or Zod into the browser bundle.
const FORBIDDEN = [
  'zod',
  'src/data/products.ts',
  'src/data/categories.ts',
  'src/data/schema.ts',
  'src/lib/catalogue.ts',
  'src/lib/pricing.ts',
];

describe('collection island bundle hygiene (ADR-0006, ADR-0004 budgets)', () => {
  const modules = reachableModules(ENTRIES, ROOT);

  it('walks the real graph (guards against the walker silently finding nothing)', () => {
    for (const expected of [
      'src/lib/catalogue-query.ts',
      'src/data/taxonomy.ts',
      'src/lib/stock.ts',
      'src/lib/money.ts',
      // Relative imports (icons) and the dynamic import of the drawer are followed too.
      'src/components/ui/icons/icon-base.tsx',
      'src/components/catalogue/filter-drawer.tsx',
    ]) {
      expect(modules.has(expected), expected).toBe(true);
    }
    expect(modules.size).toBeGreaterThan(20);
  });

  it.each(FORBIDDEN)('does not import %s at run time', (forbidden) => {
    expect(whyReachable(modules, forbidden) ?? 'not imported').toBe('not imported');
  });
});

describe('the import-graph walker itself', () => {
  const root = mkdtempSync(join(tmpdir(), 'import-graph-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const write = (file: string, content: string): void => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };

  // A fixture tree where every way of reaching the forbidden module is used once.
  write('src/data/products.ts', 'export const PRODUCTS = [];\n');
  write('src/data/schema.ts', "import { z } from 'zod';\nexport const s = z.string();\n");
  write('node_modules/zod/index.js', 'export const z = {};\n');
  write('src/a-relative.ts', "import { PRODUCTS } from './data/products';\nexport { PRODUCTS };\n");
  write('src/b-reexport.ts', "export { s } from './data/schema';\n");
  write('src/c-dynamic.ts', "export const load = () => import('./data/schema');\n");
  write('src/d-deep.ts', "import '../node_modules/zod/index.js';\n");
  write(
    'src/e-multiline.ts',
    "import {\n  PRODUCTS,\n  type X,\n} from './data/products';\nexport { PRODUCTS };\n",
  );
  write('src/f-alias.ts', "import { s } from '@/data/schema';\nexport { s };\n");
  write(
    'src/g-types-only.ts',
    "import type { s } from './data/schema';\nimport { type T } from './data/schema';\nexport type { s } from './data/schema';\nexport {};\n",
  );
  write('src/h-clean.ts', "import { x } from './h-clean-dep';\nexport { x };\n");
  write('src/h-clean-dep.ts', 'export const x = 1;\n');

  it.each([
    ['a relative import of the seed data', 'src/a-relative.ts', 'src/data/products.ts'],
    [
      'a re-export (`export ... from`) of Zod-bearing code',
      'src/b-reexport.ts',
      'src/data/schema.ts',
    ],
    ['a dynamic import()', 'src/c-dynamic.ts', 'src/data/schema.ts'],
    ['a relative path into node_modules/zod', 'src/d-deep.ts', 'zod'],
    ['a multi-line import with an inline type', 'src/e-multiline.ts', 'src/data/products.ts'],
    ['an @/ alias import', 'src/f-alias.ts', 'src/data/schema.ts'],
  ])('catches %s', (_name, entry, forbidden) => {
    const modules = reachableModules([entry], root);

    expect(whyReachable(modules, forbidden)).not.toBeNull();
  });

  it('transitively reaches Zod through the schema file', () => {
    expect(whyReachable(reachableModules(['src/f-alias.ts'], root), 'zod')).not.toBeNull();
  });

  it('ignores imports and re-exports that are type-only (the compiler erases them)', () => {
    const modules = reachableModules(['src/g-types-only.ts'], root);

    expect(whyReachable(modules, 'src/data/schema.ts')).toBeNull();
    expect(whyReachable(modules, 'zod')).toBeNull();
  });

  it('reports nothing for a clean graph', () => {
    const modules = reachableModules(['src/h-clean.ts'], root);

    expect([...modules.keys()].toSorted()).toEqual(['src/h-clean-dep.ts', 'src/h-clean.ts']);
    expect(whyReachable(modules, 'zod')).toBeNull();
  });

  it('lists the specifiers of every form', () => {
    expect(
      runtimeSpecifiers(
        [
          "import a from './a';",
          "import type { B } from './b';",
          "import { type C } from './c';",
          "import { type D, e } from './d';",
          "import './side';",
          "export { f } from './f';",
          "export * from './g';",
          "export type { H } from './h';",
          "const x = () => import('./i');",
        ].join('\n'),
      ).toSorted(),
    ).toEqual(['./a', './d', './f', './g', './i', './side']);
  });
});
