import * as z from 'zod/mini';

z.config({ jitless: true });
const querySchema = z.string().check(z.maxLength(200));
export function parseSearchQuery(input: unknown): string {
  const result = z.safeParse(querySchema, input);
  return result.success ? result.data : '';
}
