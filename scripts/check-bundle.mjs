import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { gzipSync } from 'node:zlib';

// ADR-0004: gzip level 9 of modern first-load scripts, including next-intl as application code.
const targets = [
  { path: '/en', total: 175, application: 40 },
  { path: '/th', total: 175, application: 40 },
  { path: '/en/shop', total: 175, application: 40 },
  { path: '/th/collections/foundations', total: 175, application: 40 },
  { path: '/en/products/essential-tee', total: 195, application: 60 },
  { path: '/th/products/essential-tee', total: 195, application: 60 },
];
const build = JSON.parse(readFileSync('.next/build-manifest.json', 'utf8'));
const sandbox = {};
runInNewContext(
  readFileSync('.next/server/app/[locale]/[currency]/page_client-reference-manifest.js', 'utf8'),
  sandbox,
);
const modules = sandbox.__RSC_MANIFEST['/[locale]/[currency]/page'].clientModules;
const router = Object.entries(modules).find(([name]) =>
  name.endsWith('/next/dist/esm/client/components/layout-router.js'),
)?.[1];
if (!Array.isArray(build.rootMainFiles) || !Array.isArray(router?.chunks)) {
  throw new Error(
    'Cannot identify framework runtime chunks; update the budget checker for this Next.js version.',
  );
}
// Count only the known runtime chunks as framework. Mixed/shared application chunks remain in
// application totals, so adding a client library cannot hide behind a broad vendor exclusion.
const framework = new Set([
  ...build.rootMainFiles.map((file) => `/_next/${file}`),
  ...router.chunks,
]);
const base = process.env.BUNDLE_BASE_URL ?? 'http://localhost:3100';
const server = process.env.BUNDLE_BASE_URL
  ? null
  : spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3100'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    });
let browser;
let serverOutput = '';
for (const stream of [server?.stdout, server?.stderr]) {
  stream?.on('data', (chunk) => {
    serverOutput = (serverOutput + chunk).slice(-8000);
  });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(serverOutput);
    try {
      ready = (await fetch(`${base}/en`)).ok;
    } catch {
      /* Wait for this server's readiness. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error(`Production server did not become ready. ${serverOutput}`);
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const reports = [];
  for (const target of targets) {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    const chunks = new Map();
    const jobs = [];
    const failures = [];
    page.on('response', (response) => {
      if (response.request().resourceType() !== 'script') return;
      const src = new URL(response.url()).pathname;
      jobs.push(
        (async () => {
          if (!response.ok()) throw new Error(`${src}: HTTP ${response.status()}`);
          const bytes = gzipSync(await response.body(), { level: 9 }).length;
          chunks.set(response.url(), { src, bytes, framework: framework.has(src) });
        })().catch((error) => failures.push(String(error))),
      );
    });
    try {
      const response = await page.goto(`${base}${target.path}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`${target.path}: HTTP ${response?.status()}`);
      await Promise.all(jobs);
      if (failures.length) throw new Error(failures.join('\n'));
      if (chunks.size === 0) throw new Error(`${target.path}: no scripts measured`);
      const measured = [...chunks.values()];
      const totalBytes = measured.reduce((sum, chunk) => sum + chunk.bytes, 0);
      const applicationBytes = measured
        .filter((chunk) => !chunk.framework)
        .reduce((sum, chunk) => sum + chunk.bytes, 0);
      reports.push({
        path: target.path,
        totalBytes,
        applicationBytes,
        totalBudget: target.total * 1024,
        applicationBudget: target.application * 1024,
        chunks: measured,
      });
    } finally {
      await context.close();
    }
  }
  writeFileSync('.next/bundle-report.json', `${JSON.stringify(reports, null, 2)}\n`);
  for (const report of reports) {
    process.stdout.write(
      `${report.path}: total ${(report.totalBytes / 1024).toFixed(1)}/${report.totalBudget / 1024} KiB; application ${(report.applicationBytes / 1024).toFixed(1)}/${report.applicationBudget / 1024} KiB gzip\n`,
    );
  }
  if (
    reports.some(
      (report) =>
        report.totalBytes > report.totalBudget ||
        report.applicationBytes > report.applicationBudget,
    )
  ) {
    throw new Error('JavaScript budget exceeded (ADR-0004). See .next/bundle-report.json.');
  }
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
