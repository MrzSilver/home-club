import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
if (process.env.LHCI_TARGET !== 'preview' || !process.env.LHCI_BASE_URL) {
  throw new Error('Preview preflight requires LHCI_TARGET=preview and LHCI_BASE_URL');
}
const config = require('../lighthouserc.cjs');

const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const headers = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
await Promise.all(
  config.ci.collect.url.map(async (url) => {
    const response = await fetch(url, { redirect: 'manual', headers });
    await response.body?.cancel();
    if (response.status !== 200)
      throw new Error(`${url}: expected 200, received ${response.status}`);
    if (!/(?:^|[,\s])noindex(?:$|[,\s])/i.test(response.headers.get('x-robots-tag') ?? '')) {
      throw new Error(`${url}: Preview must retain X-Robots-Tag: noindex`);
    }
  }),
);
process.stdout.write(
  `Preview preflight: ${config.ci.collect.url.length} URLs return 200 and retain noindex.\n`,
);
