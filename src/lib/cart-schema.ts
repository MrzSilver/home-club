import * as z from 'zod/mini';
import type { CartLine } from '@/data/schema';

// Never probe eval under the storefront CSP.
z.config({ jitless: true });

const lineSchema = z.strictObject({
  sku: z.string(),
  qty: z.number().check(z.int(), z.minimum(1)),
  lookId: z.optional(z.string().check(z.minLength(1), z.maxLength(100))),
});
const linesSchema = z.array(lineSchema).check(z.maxLength(500));

const savedCartSchema = z.strictObject({
  version: z.literal(1),
  state: z.strictObject({ lines: linesSchema }),
});

export function parseSavedCart(
  input: unknown,
): { version: 1; state: { lines: CartLine[] } } | null {
  const parsed = z.safeParse(savedCartSchema, input);
  return parsed.success ? parsed.data : null;
}
