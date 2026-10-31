import { z } from 'zod';

const DEFAULT_SITE_URL = 'http://localhost:3000';

// An unset variable and an empty one (`KEY=` in a .env file) both mean "use the default".
const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    emptyToUndefined,
    z.url({ protocol: /^https?$/ }).default(DEFAULT_SITE_URL),
  ),
  // Permissive on purpose: only the exact value "production" changes behaviour.
  VERCEL_ENV: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Hosts that can never be a public origin; `new URL` keeps IPv6 hosts bracketed. */
function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

// Returns a problem description, or null when the origin is fit for Production.
function productionSiteUrlProblem(raw: string | undefined): string | null {
  if (raw === undefined || raw === '')
    return 'must be set to the public https origin for Production';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null; // The schema already reports a malformed URL.
  }
  if (url.protocol !== 'https:' || isLocalHostname(url.hostname)) {
    return 'must be set to the public https origin for Production (not localhost or http)';
  }
  return null;
}

/** Validates raw environment values; throws one error listing every invalid key. */
export function parseEnv(raw: Readonly<Record<string, string | undefined>>): Env {
  const result = envSchema.safeParse(raw);
  const details: string[] = result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
  if (raw.VERCEL_ENV === 'production' && details.length === 0) {
    const problem = productionSiteUrlProblem(raw.NEXT_PUBLIC_SITE_URL);
    if (problem) details.push(`NEXT_PUBLIC_SITE_URL: ${problem}`);
  }
  if (!result.success || details.length > 0) {
    throw new Error(`Invalid environment variables - ${details.join('; ')}`);
  }
  return result.data;
}

// NEXT_PUBLIC_* values are inlined at build time only when referenced literally,
// so each key is listed explicitly instead of passing `process.env` wholesale.
export const env: Env = parseEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  VERCEL_ENV: process.env.VERCEL_ENV,
});
