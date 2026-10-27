import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

const tokensCss = read('src/styles/tokens.css');
const globalsCss = read('src/styles/globals.css');

/** Light-theme colour tokens: `--color-name: #rrggbb;` inside tokens.css. */
function parseHexColours(css: string): Record<string, string> {
  const colours: Record<string, string> = {};
  for (const match of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) colours[name] = value;
  }
  return colours;
}

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const colours = parseHexColours(tokensCss);

describe('colour tokens (DESIGN 2.1)', () => {
  it('defines every light-theme token with the documented value', () => {
    expect(colours).toEqual({
      canvas: '#f7f4ef',
      surface: '#ede6db',
      ink: '#141412',
      muted: '#5e584e',
      line: '#cfc7ba',
      field: '#857c6e',
      sand: '#d6bf9c',
      forest: '#2b372d',
      danger: '#a3261f',
      success: '#2f6b3f',
      focus: '#1f4fd8',
    });
  });

  it('defines the overlay scrim as a translucent ink', () => {
    expect(tokensCss).toMatch(/--color-overlay:\s*rgb\(20 20 18 \/ 0\.45\)\s*;/);
  });
});

// DESIGN 2.3 "Verified contrast". `listed` is the ratio printed in the table; `min` is the WCAG
// threshold for its "Passes" column: 7 for AAA, 4.5 for AA text, 3 for AA non-text.
const CONTRAST_TABLE: ReadonlyArray<{
  name: string;
  foreground: string;
  background: string;
  listed: number;
  min: number;
}> = [
  { name: 'ink on canvas', foreground: 'ink', background: 'canvas', listed: 16.8, min: 7 },
  { name: 'muted on canvas', foreground: 'muted', background: 'canvas', listed: 6.4, min: 4.5 },
  { name: 'muted on surface', foreground: 'muted', background: 'surface', listed: 5.7, min: 4.5 },
  { name: 'canvas on ink', foreground: 'canvas', background: 'ink', listed: 16.8, min: 7 },
  { name: 'ink on sand', foreground: 'ink', background: 'sand', listed: 10.4, min: 7 },
  { name: 'canvas on forest', foreground: 'canvas', background: 'forest', listed: 11.4, min: 7 },
  { name: 'danger on canvas', foreground: 'danger', background: 'canvas', listed: 6.7, min: 4.5 },
  { name: 'success on canvas', foreground: 'success', background: 'canvas', listed: 5.8, min: 4.5 },
  { name: 'focus on canvas', foreground: 'focus', background: 'canvas', listed: 6.0, min: 3 },
  { name: 'field on canvas', foreground: 'field', background: 'canvas', listed: 3.8, min: 3 },
  { name: 'field on surface', foreground: 'field', background: 'surface', listed: 3.3, min: 3 },
];

describe('contrast (DESIGN 2.3, WCAG 2.2)', () => {
  it.each(CONTRAST_TABLE)(
    '$name meets its threshold and matches the table within 0.2',
    ({ foreground, background, listed, min }) => {
      const fg = colours[foreground];
      const bg = colours[background];
      expect(fg).toBeDefined();
      expect(bg).toBeDefined();

      const ratio = contrast(fg ?? '', bg ?? '');
      expect(ratio).toBeGreaterThanOrEqual(min);
      expect(Math.abs(ratio - listed)).toBeLessThanOrEqual(0.2);
    },
  );

  it('keeps the form-error and success colours readable on surface panels too', () => {
    expect(contrast(colours['danger'] ?? '', colours['surface'] ?? '')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colours['success'] ?? '', colours['surface'] ?? '')).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});

describe('non-colour tokens', () => {
  it('defines radii, the single shadow, easing and durations from DESIGN 4 and 7', () => {
    expect(tokensCss).toMatch(/--radius-sm:\s*0\.375rem/);
    expect(tokensCss).toMatch(/--radius-md:\s*0\.75rem/);
    expect(tokensCss).toMatch(/--radius-lg:\s*1\.25rem/);
    expect(tokensCss).toMatch(/--radius-full:\s*9999px/);
    expect(tokensCss).toMatch(/--shadow-float:\s*0 8px 32px rgb\(20 20 18 \/ 0\.12\)/);
    expect(tokensCss.match(/--shadow-[a-z-]+:/g)).toEqual(['--shadow-float:']);
    expect(tokensCss).toMatch(/--ease-standard:\s*cubic-bezier\(0\.2, 0, 0, 1\)/);
    expect(tokensCss).toMatch(/--dur-fast:\s*120ms/);
    expect(tokensCss).toMatch(/--dur-base:\s*200ms/);
    expect(tokensCss).toMatch(/--dur-slow:\s*400ms/);
  });

  it('defines the container, breakpoints and the Thai type values', () => {
    expect(tokensCss).toMatch(/--container-page:\s*80rem/);
    for (const [name, value] of [
      ['sm', '40rem'],
      ['md', '48rem'],
      ['lg', '64rem'],
      ['xl', '80rem'],
    ] as const) {
      expect(tokensCss).toContain(`--breakpoint-${name}: ${value}`);
    }
    for (const [role, thai] of [
      ['display', '1.25'],
      ['h1', '1.3'],
      ['h2', '1.4'],
      ['h3', '1.5'],
      ['body', '1.75'],
      ['small', '1.65'],
      ['eyebrow', '1.6'],
    ] as const) {
      expect(tokensCss).toContain(`--type-${role}-leading-th: ${thai};`);
    }
  });
});

describe('Thai and motion rules in globals.css (RULES 6.5, DESIGN 7)', () => {
  it('forbids uppercase and letter-spacing on Thai text outside any cascade layer', () => {
    const guard = globalsCss.match(/^\*:lang\(th\)\s*\{([^}]*)\}/m);

    expect(guard?.[1]).toMatch(/letter-spacing:\s*0;/);
    expect(guard?.[1]).toMatch(/text-transform:\s*none;/);
  });

  it('gives every type role a Thai override', () => {
    for (const role of ['display', 'h1', 'h2', 'h3', 'body', 'small', 'eyebrow', 'button']) {
      const block = globalsCss.match(new RegExp(`\\.text-${role}\\s*\\{[\\s\\S]*?\\n  \\}\\n`));
      expect(block?.[0], `.text-${role}`).toContain('&:lang(th)');
    }
  });

  it('has a visible focus-visible ring and reduced-motion handling', () => {
    expect(globalsCss).toMatch(/:focus-visible\s*\{[^}]*outline:[^;]*var\(--color-focus\)/);
    expect(globalsCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(globalsCss).not.toMatch(/outline:\s*(none|0)/);
  });
});

function sourceFiles(dir: string, extensions: readonly string[]): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(join(ROOT, path)).isDirectory()) return sourceFiles(path, extensions);
    return extensions.some((extension) => entry.endsWith(extension)) ? [path] : [];
  });
}

describe('styling rules (RULES 5.1, 5.2)', () => {
  // src/data may carry swatch hex values as catalogue data, so only UI and style code is scanned.
  const uiFiles = [
    ...sourceFiles('src/components', ['.ts', '.tsx', '.css']),
    ...sourceFiles('src/app', ['.ts', '.tsx', '.css']),
    ...sourceFiles('src/styles', ['.ts', '.css']).filter((file) => !file.endsWith('tokens.css')),
  ];

  it('scans a non-trivial set of files', () => {
    expect(uiFiles.length).toBeGreaterThan(10);
  });

  it('uses no raw hex colour outside tokens.css', () => {
    const offenders = uiFiles.filter((file) => /#[0-9a-fA-F]{3,8}\b/.test(read(file)));

    expect(offenders).toEqual([]);
  });

  it('uses no !important and no arbitrary pixel values', () => {
    const offenders = uiFiles.filter((file) => {
      const source = read(file);
      return /!important/.test(source) || /\[-?\d*\.?\d+px\]/.test(source);
    });

    expect(offenders).toEqual([]);
  });
});

// Runs the real Tailwind compiler over globals.css, so these tests see what the build would emit.
const nodeRequire = createRequire(join(ROOT, 'package.json'));

async function compileUtilities(candidates: string[]): Promise<string> {
  const compiler = await compile(globalsCss, {
    base: join(ROOT, 'src/styles'),
    loadStylesheet: async (id, base) => {
      const path =
        id === 'tailwindcss' ? nodeRequire.resolve('tailwindcss/index.css') : resolve(base, id);
      return { path, base: dirname(path), content: read(path.replace(`${ROOT}/`, '')) };
    },
  });
  return compiler.build(candidates);
}

describe('Tailwind only exposes the design scale (DESIGN 2, 3, 7)', () => {
  it.each([
    'text-sm',
    'text-2xl',
    'leading-tight',
    'tracking-wide',
    'font-sans',
    'font-mono',
    'ease-in-out',
    'animate-spin',
    'max-w-sm',
    'bg-white',
    'rounded-xl',
    'shadow-md',
    'blur-sm',
    'sm:text-lg',
  ])('does not generate %s', async (candidate) => {
    const css = await compileUtilities([candidate]);

    expect(css).not.toMatch(/@layer utilities\s*\{\s*\.[^{]+\{/);
  });

  it('still generates the token utilities and the open-ended ones the components use', async () => {
    const css = await compileUtilities([
      'bg-canvas',
      'text-ink',
      'border-field',
      'ring-focus',
      'rounded-md',
      'shadow-float',
      'ease-standard',
      'duration-base',
      'max-w-page',
      'px-gutter',
      'py-section',
      'bg-ink/92',
      'text-current',
      'bg-transparent',
      'z-50',
      'opacity-40',
      'font-medium',
      'md:px-6',
    ]);

    for (const fragment of [
      '.bg-canvas',
      '.text-ink',
      '.border-field',
      '.ring-focus',
      '.rounded-md',
      '.shadow-float',
      '.ease-standard',
      '.duration-base',
      '.max-w-page',
      '.px-gutter',
      '.py-section',
      '.z-50',
      '.opacity-40',
      '.font-medium',
    ]) {
      expect(css, fragment).toContain(fragment);
    }
  });
});

describe('reduced motion caps every duration (DESIGN 7)', () => {
  it('forces transition and animation durations outside any layer, so utilities cannot beat it', async () => {
    const css = await compileUtilities(['duration-500']);
    const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/);

    expect(block?.[0]).toMatch(/animation-duration:\s*1ms/);
    expect(block?.[0]).toMatch(/animation-iteration-count:\s*1/);
    expect(block?.[0]).toMatch(/transition-duration:\s*var\(--dur-base\)/);
    // --dur-base is 100ms inside the same block.
    expect(block?.[0]).toMatch(/--dur-base:\s*100ms/);
    // The block sits at the top level of the stylesheet, after the layers that hold utilities.
    expect(css.indexOf('@media (prefers-reduced-motion: reduce)')).toBeGreaterThan(
      css.indexOf('.duration-500'),
    );
  });
});
