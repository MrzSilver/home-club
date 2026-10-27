import { z } from 'zod';

const DEFAULT_SITE_URL = 'http://localhost:3000';

// An unset variable and an empty one (`KEY=` in a .env file) both mean "use the default".
const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    emptyToUndefined,
    z.url({ protocol: /^https?$/ }).default(DEFAULT_SITE_URL),
  ),
});

export type Env = z.infer<typeof envSchema>;

/** Validates raw environment values; throws one error listing every invalid key. */
export function parseEnv(raw: Readonly<Record<string, string | undefined>>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment variables - ${details}`);
  }
  return result.data;
}

// NEXT_PUBLIC_* values are inlined at build time only when referenced literally,
// so each key is listed explicitly instead of passing `process.env` wholesale.
export const env: Env = parseEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
