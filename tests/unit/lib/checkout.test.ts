import { describe, expect, it } from 'vitest';
import { validateCheckout, CHECKOUT_FIELDS, parseDemoOrder } from '@/lib/checkout';

const valid = {
  name: 'Demo Customer',
  email: 'demo@example.com',
  address: '123 Example',
  city: 'Example',
  postalCode: '10000',
  country: 'Thailand',
  shipping: 'standard',
};
describe('demo checkout validation (FR-053)', () => {
  it('only displays validated demo references from the URL', () => {
    const id = 'HC-DEMO-12345678-abcd-abcd-abcd-123456789012';
    expect(parseDemoOrder(id)).toBe(id);
    for (const value of [null, '', 'actual-order', '<script>'])
      expect(parseDemoOrder(value)).toBeNull();
  });
  it('accepts example details and either simulated shipping option', () => {
    expect(validateCheckout(valid)).toEqual([]);
    expect(validateCheckout({ ...valid, shipping: 'express' })).toEqual([]);
  });
  it('reports missing, malformed, excessive and unexpected input without persisting it', () => {
    expect(
      validateCheckout({
        ...valid,
        name: ' ',
        email: 'invalid',
        address: 'x'.repeat(201),
        shipping: 'unknown',
      }),
    ).toEqual(['name', 'email', 'address', 'shipping']);
    expect(validateCheckout(null)).toEqual(CHECKOUT_FIELDS);
    expect(validateCheckout({ ...valid, price: 1 })).toEqual(CHECKOUT_FIELDS);
  });
});
