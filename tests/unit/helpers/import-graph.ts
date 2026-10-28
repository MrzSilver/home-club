import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

// Walks the run-time import graph of a set of source files, for tests that guard what a client bundle
// may contain. Type-only imports are erased by the compiler and are skipped. Followed: `import ... from`,
// side-effect `import 'x'`, `export ... from`, and dynamic `import('x')`. Specifiers are resolved
// against the importer when relative and against `src/` when they start with `@/`.

const IMPORT_FROM = /^import\s+(type\s+)?([^;]*?)\s+from\s+'([^']+)'/gm;
const IMPORT_SIDE_EFFECT = /^import\s+'([^']+)'/gm;
const EXPORT_FROM = /\bexport\s+(type\s+)?(\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+'([^']+)'/g;
const DYNAMIC_IMPORT = /\bimport\(\s*'([^']+)'\s*\)/g;
// `import { type A, type B } from ...` is fully erased; `import { type A, B }` is not.
const ALL_INLINE_TYPES = /^\{\s*(type\s+\w+\s*,?\s*)+\}$/;

/** Run-time specifiers of one source text (type-only imports and exports left out). */
export function runtimeSpecifiers(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(IMPORT_FROM)) {
    const [, typeOnly, clause = '', specifier = ''] = match;
    if (typeOnly === undefined && !ALL_INLINE_TYPES.test(clause)) found.push(specifier);
  }
  for (const match of source.matchAll(EXPORT_FROM)) {
    const [, typeOnly, clause = '', specifier = ''] = match;
    if (typeOnly === undefined && !ALL_INLINE_TYPES.test(clause)) found.push(specifier);
  }
  for (const match of source.matchAll(IMPORT_SIDE_EFFECT)) found.push(match[1] ?? '');
  for (const match of source.matchAll(DYNAMIC_IMPORT)) found.push(match[1] ?? '');
  return found;
}

function candidates(base: string): string[] {
  return [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx'), base];
}

/** Repo-relative path of the file a specifier points to; a package name for bare specifiers. */
function resolveSpecifier(root: string, importer: string, specifier: string): string {
  let base: string | null = null;
  if (specifier.startsWith('@/')) base = join('src', specifier.slice(2));
  else if (specifier.startsWith('.')) base = normalize(join(dirname(importer), specifier));
  if (base === null) return specifier;
  return candidates(base).find((file) => existsSync(join(root, file))) ?? base;
}

/** Every module reachable at run time from `entries`, mapped to the file that first imported it. */
export function reachableModules(entries: readonly string[], root: string): Map<string, string> {
  const seen = new Map<string, string>();
  const queue = entries.map((file) => ({ file, from: 'entry' }));
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    if (seen.has(next.file)) continue;
    seen.set(next.file, next.from);
    const absolute = join(root, next.file);
    if (!/\.(tsx?|mjs|js)$/.test(next.file) || !existsSync(absolute)) continue;
    for (const specifier of runtimeSpecifiers(readFileSync(absolute, 'utf8'))) {
      queue.push({ file: resolveSpecifier(root, next.file, specifier), from: next.file });
    }
  }
  return seen;
}

/** Why a forbidden module is reachable ("imported by x"), or null when it is not. */
export function whyReachable(
  modules: ReadonlyMap<string, string>,
  forbidden: string,
): string | null {
  for (const [module, importer] of modules) {
    const path = relative('.', module).split('\\').join('/');
    // A package (`zod`) or a path into it (`../../node_modules/zod/index.js`), or the exact file.
    const isPackage = path === forbidden || path.includes(`node_modules/${forbidden}/`);
    if (isPackage || path === forbidden) return `${module} imported by ${importer}`;
  }
  return null;
}
