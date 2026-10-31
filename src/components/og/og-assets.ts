import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Satori (the renderer behind next/og) cannot read CSS variables or .woff2, so the generated Open
// Graph images read the brand colours from src/styles/tokens.css and the fonts from the self-hosted
// @fontsource .woff files, both at build time (docs/adr/0011-og-images.md). Reading the token file
// keeps tokens.css the single place that holds raw colour values.

export const OG_SIZE = { width: 1200, height: 630 } as const;

export type OgColors = Readonly<
  Record<'canvas' | 'surface' | 'ink' | 'muted' | 'line' | 'field' | 'sand', string>
>;

const COLOR_NAMES = ['canvas', 'surface', 'ink', 'muted', 'line', 'field', 'sand'] as const;

export async function loadOgColors(): Promise<OgColors> {
  const css = await readFile(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
  const entries = COLOR_NAMES.map((name) => {
    const match = new RegExp(`--color-${name}: *(#[0-9a-fA-F]{6}) *;`).exec(css);
    if (!match?.[1]) throw new Error(`tokens.css has no --color-${name} hex value`);
    return [name, match[1]] as const;
  });
  return Object.fromEntries(entries) as OgColors;
}

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500;
  style: 'normal';
};

async function loadWoff(
  family: string,
  weight: 400 | 500,
  name: string,
  subset: string,
): Promise<OgFont> {
  const file = join(
    process.cwd(),
    'node_modules/@fontsource',
    family,
    'files',
    `${family}-${subset}-${weight}-normal.woff`,
  );
  const buffer = await readFile(file);
  const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return { name, data: data as ArrayBuffer, weight, style: 'normal' };
}

/** Jost 500 for the wordmark and titles, Inter 400 for captions: the site's Latin pair, two files. */
export function loadOgFonts(): Promise<OgFont[]> {
  return Promise.all([
    loadWoff('jost', 500, 'Jost', 'latin'),
    loadWoff('inter', 400, 'Inter', 'latin'),
  ]);
}
