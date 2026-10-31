import * as z from 'zod/mini';

z.config({ jitless: true });
const text = z.string().check(z.trim(), z.minLength(1), z.maxLength(200));
export const checkoutSchema = z.strictObject({
  name: text,
  email: z.string().check(z.trim(), z.email(), z.maxLength(254)),
  address: text,
  city: text,
  postalCode: text,
  country: text,
  shipping: z.enum(['standard', 'express']),
});
export type CheckoutField = keyof z.infer<typeof checkoutSchema>;
const demoOrderSchema = z
  .string()
  .check(z.regex(/^HC-DEMO-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/));
export function parseDemoOrder(input: unknown): string | null {
  const result = z.safeParse(demoOrderSchema, input);
  return result.success ? result.data : null;
}
export const CHECKOUT_FIELDS = [
  'name',
  'email',
  'address',
  'city',
  'postalCode',
  'country',
  'shipping',
] as const;
export function validateCheckout(data: unknown): CheckoutField[] {
  const result = z.safeParse(checkoutSchema, data);
  if (result.success) return [];
  if (result.error.issues.some((issue) => issue.path.length === 0)) return [...CHECKOUT_FIELDS];
  return CHECKOUT_FIELDS.filter((field) =>
    result.error.issues.some((issue) => issue.path[0] === field),
  );
}
