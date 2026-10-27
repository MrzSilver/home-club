import { describe, expect, it } from 'vitest';

import en from '@messages/en.json';
import th from '@messages/th.json';

// FR-070, RULES 6.2: both catalogues carry the same keys, nothing is empty and every message uses the
// same ICU arguments. The helpers are exercised on broken fixtures below so the checks themselves are
// known to fail when they should.

type Catalogue = { [key: string]: string | Catalogue };

/** Dot-separated path of every message (leaf) in a nested catalogue. */
function flatten(catalogue: Catalogue, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(catalogue)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') out.set(path, value);
    else for (const [nested, text] of flatten(value, path)) out.set(nested, text);
  }
  return out;
}

/** Index of the `}` that closes the `{` at `start` (or the end of the text when unbalanced). */
function closingBrace(text: string, start: number): number {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return text.length;
}

/** Splits `name, type, rest` on the first two commas that are outside braces. */
function splitArgument(body: string): [string, string, string] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let index = 0; index < body.length && parts.length < 2; index += 1) {
    if (body[index] === '{') depth += 1;
    if (body[index] === '}') depth -= 1;
    if (body[index] === ',' && depth === 0) {
      parts.push(body.slice(from, index));
      from = index + 1;
    }
  }
  parts.push(body.slice(from));
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
}

/**
 * Names of the ICU arguments and rich-text tags a message uses, including those nested in
 * plural/select branches. `{count, plural, one {# item} other {# items}}` -> ["count"];
 * `Hello {name}, <b>read</b>` -> ["<b>", "name"]. Quoted braces ('{') are literal text.
 */
function icuArguments(message: string): string[] {
  const found = new Set<string>();

  function scan(text: string): void {
    let index = 0;
    while (index < text.length) {
      const char = text.charAt(index);
      if (char === "'" && (text[index + 1] === '{' || text[index + 1] === '}')) {
        const close = text.indexOf("'", index + 1);
        index = close === -1 ? text.length : close + 1;
      } else if (char === '<') {
        const tag = /^<\/?([A-Za-z][\w-]*)\s*\/?>/.exec(text.slice(index));
        if (tag?.[1] !== undefined) found.add(`<${tag[1]}>`);
        index += tag === null ? 1 : tag[0].length;
      } else if (char === '{') {
        const end = closingBrace(text, index);
        readArgument(text.slice(index + 1, end));
        index = end + 1;
      } else {
        index += 1;
      }
    }
  }

  function readArgument(body: string): void {
    const [name, type, branches] = splitArgument(body);
    if (name.trim() !== '') found.add(name.trim());
    if (!['plural', 'select', 'selectordinal'].includes(type.trim())) return;
    // `one {# item} other {# items}`: each top-level brace pair is a message of its own.
    let index = branches.indexOf('{');
    while (index !== -1) {
      const end = closingBrace(branches, index);
      scan(branches.slice(index + 1, end));
      index = branches.indexOf('{', end + 1);
    }
  }

  scan(message);
  return [...found].sort();
}

type ParityReport = {
  missingInSecond: string[];
  missingInFirst: string[];
  empty: string[];
  placeholderMismatch: string[];
};

function compareCatalogues(first: Catalogue, second: Catalogue): ParityReport {
  const a = flatten(first);
  const b = flatten(second);
  const empty = [...a, ...b].filter(([, text]) => text.trim() === '').map(([key]) => key);
  const mismatch = [...a.keys()]
    .filter((key) => b.has(key))
    .filter(
      (key) =>
        icuArguments(a.get(key) ?? '').join('|') !== icuArguments(b.get(key) ?? '').join('|'),
    );
  return {
    missingInSecond: [...a.keys()].filter((key) => !b.has(key)).sort(),
    missingInFirst: [...b.keys()].filter((key) => !a.has(key)).sort(),
    empty: [...new Set(empty)].sort(),
    placeholderMismatch: mismatch.sort(),
  };
}

describe('message catalogues: en and th stay in step (FR-070)', () => {
  const report = compareCatalogues(en, th);

  it('have identical key sets', () => {
    expect(report.missingInSecond).toEqual([]);
    expect(report.missingInFirst).toEqual([]);
  });

  it('have no empty strings', () => {
    expect(report.empty).toEqual([]);
  });

  it('use the same ICU placeholders for every key', () => {
    expect(report.placeholderMismatch).toEqual([]);
  });

  it('contain at least the namespaces the app reads', () => {
    expect(Object.keys(en).sort()).toEqual([
      'a11y',
      'common',
      'footer',
      'home',
      'nav',
      'notFound',
      'seo',
    ]);
  });

  it('keep the brand name in Latin letters in both locales', () => {
    expect(en.common.brandName).toBe('Home Club Foundation');
    expect(th.common.brandName).toBe('Home Club Foundation');
    expect(th.common.wordmark).toEqual(en.common.wordmark);
  });

  it('write Thai copy in Thai script (no English copy left in th.json except brand and endonyms)', () => {
    const allowedLatin = new Set([
      'common.brandName',
      'common.wordmark.name',
      'common.wordmark.descriptor',
      'common.locale.en',
      'seo.titleTemplate',
    ]);
    const latinOnly = [...flatten(th)]
      .filter(([key, text]) => !allowedLatin.has(key) && !/[฀-๿]/.test(text))
      .map(([key]) => key);
    expect(latinOnly).toEqual([]);
  });
});

describe('parity helpers detect real problems', () => {
  it('reports a key missing from either side', () => {
    const report = compareCatalogues(
      { a: { x: 'one', y: 'two' } },
      { a: { x: 'หนึ่ง' }, b: 'สาม' },
    );
    expect(report.missingInSecond).toEqual(['a.y']);
    expect(report.missingInFirst).toEqual(['b']);
  });

  it('reports empty and whitespace-only strings', () => {
    const report = compareCatalogues({ a: 'one', b: ' ' }, { a: '', b: 'สอง' });
    expect(report.empty).toEqual(['a', 'b']);
  });

  it('reports a placeholder that differs between locales', () => {
    const report = compareCatalogues(
      { a: 'Hello {name}', b: '{count, plural, one {# item} other {# items}}', c: 'Plain' },
      { a: 'สวัสดี {nom}', b: '{count, plural, other {# ชิ้น}}', c: 'ธรรมดา' },
    );
    expect(report.placeholderMismatch).toEqual(['a']);
  });

  it('extracts arguments, plural branches, nested arguments, tags and quoted braces', () => {
    expect(icuArguments('No arguments here')).toEqual([]);
    expect(icuArguments('Hello {name}!')).toEqual(['name']);
    expect(icuArguments('{count, plural, one {# item} other {# items}}')).toEqual(['count']);
    expect(icuArguments('{n, plural, one {{who} has # item} other {{who} has # items}}')).toEqual([
      'n',
      'who',
    ]);
    expect(icuArguments('{gender, select, male {He} female {She} other {They}}')).toEqual([
      'gender',
    ]);
    expect(icuArguments('Read <link>the guide</link> and <b>learn</b>')).toEqual(['<b>', '<link>']);
    expect(icuArguments("Use '{' and '}' literally, not {value}")).toEqual(['value']);
    expect(icuArguments('{price, number, ::currency/USD}')).toEqual(['price']);
  });

  it('flattens nested catalogues into dotted paths', () => {
    expect([...flatten({ a: { b: 'x', c: { d: 'y' } }, e: 'z' }).keys()]).toEqual([
      'a.b',
      'a.c.d',
      'e',
    ]);
  });
});
