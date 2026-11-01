import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const IMAGES_DIR = path.join(ROOT, 'public', 'images');
const REGISTER = readFileSync(path.join(ROOT, 'docs', 'ASSETS.md'), 'utf8').replace(/\r\n/g, '\n');

/** Repo-relative, forward-slash paths of every file below `dir`, sorted. */
function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(absolute));
    else out.push(path.relative(ROOT, absolute).split(path.sep).join('/'));
  }
  return out.sort();
}

/** Files whose exact path, or parent directory as `` `dir/` ``, appears in the register text. */
function findUnlogged(files: string[], register: string): string[] {
  return files.filter((file) => {
    const dir = file.slice(0, file.lastIndexOf('/'));
    return !register.includes(file) && !register.includes(`\`${dir}/\``);
  });
}

function currentRegister(): string {
  const start = REGISTER.indexOf('## Current register');
  expect(start, 'ASSETS.md must have a "## Current register" section').toBeGreaterThanOrEqual(0);
  const rest = REGISTER.slice(start + '## Current register'.length);
  const end = rest.indexOf('\n## ');
  return end === -1 ? rest : rest.slice(0, end);
}

describe('assets register (RULES 14)', () => {
  it('every shipped image under public/images is logged in ASSETS.md (RULES 14.1)', () => {
    const files = listFiles(IMAGES_DIR);
    expect(files.length).toBeGreaterThan(0);
    const unlogged = findUnlogged(files, REGISTER);
    expect(unlogged, `Unlogged files:\n${unlogged.join('\n')}`).toEqual([]);
  });

  it('flags a file whose path and directory are both absent from the register (RULES 14.1)', () => {
    const files = ['public/images/brand/hero-1.webp', 'public/images/new-dir/stray.webp'];
    expect(findUnlogged(files, REGISTER)).toEqual(['public/images/new-dir/stray.webp']);
  });

  it('every AI-generated product view is flagged and marked replace-before-marketing (RULES 14.3)', () => {
    const section = currentRegister();
    const row = section
      .split('\n')
      .find(
        (line) =>
          line.startsWith('|') &&
          line.includes('{colour}-2.webp') &&
          line.includes('{colour}-3.webp'),
      );
    expect(row, 'a register row must cover {colour}-2.webp and {colour}-3.webp').toBeDefined();

    const cells = (row ?? '')
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    const [, , , , , aiColumn, statusColumn] = cells;
    expect(aiColumn).toContain('**Yes**');
    expect(statusColumn).toContain('replace-before-marketing');

    const aiDirs = new Set(
      listFiles(path.join(IMAGES_DIR, 'products'))
        .filter((file) => /-[23]\.webp$/.test(file))
        .map((file) => file.slice(0, file.lastIndexOf('/'))),
    );
    expect(aiDirs.size).toBeGreaterThan(0);
    const missing = [...aiDirs].filter((dir) => !section.includes(`\`${dir}/\``));
    expect(
      missing,
      `Product dirs with AI views not listed in Current register:\n${missing.join('\n')}`,
    ).toEqual([]);
  });

  it('the register has no shipped row left with a placeholder status outside Superseded', () => {
    const offenders = currentRegister()
      .split('\n')
      .filter((line) => /placeholder/i.test(line) && !line.includes('replace-before-marketing'));
    expect(offenders, `Rows missing replace-before-marketing:\n${offenders.join('\n')}`).toEqual(
      [],
    );
  });

  it('logs the app icon src/app/icon.svg', () => {
    expect(REGISTER).toContain('src/app/icon.svg');
  });
});
