'use client';
import { useRef, useState, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { useCart, useCartContext } from '@/components/cart/cart-context';
import { Button, buttonClasses } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { validateCheckout, CHECKOUT_FIELDS, type CheckoutField } from '@/lib/checkout';
import { priceLookCart } from '@/lib/look-cart';
import { formatMoney, type Currency } from '@/lib/money';

const INPUTS = ['name', 'email', 'address', 'city', 'postalCode', 'country'] as const;
const AUTOCOMPLETE = {
  name: 'name',
  email: 'email',
  address: 'street-address',
  city: 'address-level2',
  postalCode: 'postal-code',
  country: 'country-name',
} as const;
export function CheckoutForm({ currency }: { currency: Currency }): ReactElement {
  const t = useTranslations('checkout');
  const { products, looks = [], locale, store } = useCartContext();
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const [errors, setErrors] = useState<CheckoutField[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  if (!hydrated) return <p role="status">{t('loading')}</p>;
  if (!lines.length)
    return (
      <div className="space-y-4">
        <p>{t('empty')}</p>
        <Link href="/shop" className={buttonClasses()}>
          {t('shop')}
        </Link>
      </div>
    );
  const price = priceLookCart(lines, products, looks, currency);
  return (
    <form
      noValidate
      className="grid gap-8 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const errors = validateCheckout(
          Object.fromEntries(CHECKOUT_FIELDS.map((field) => [field, data.get(field)])),
        );
        setErrors(errors);
        if (errors.length) {
          requestAnimationFrame(() => errorRef.current?.focus());
          return;
        }
        const order = `HC-DEMO-${crypto.randomUUID()}`;
        form.reset();
        store.getState().clear();
        router.push(`/checkout/success?order=${order}`);
      }}
    >
      <div className="space-y-6">
        {errors.length ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="space-y-3 rounded-md border border-danger p-4"
          >
            <h2 className="text-h3">{t('errors')}</h2>
            <ul>
              {errors.map((field) => (
                <li key={field}>
                  <a
                    href={`#checkout-${field}`}
                    className="inline-flex min-h-11 items-center underline"
                  >
                    {t(`fields.${field}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {INPUTS.map((field) => (
          <label key={field} className="block space-y-2" htmlFor={`checkout-${field}`}>
            <span>{t(`fields.${field}`)}</span>
            <input
              id={`checkout-${field}`}
              name={field}
              type={field === 'email' ? 'email' : 'text'}
              autoComplete={AUTOCOMPLETE[field]}
              required
              maxLength={field === 'email' ? 254 : 200}
              aria-invalid={errors.includes(field) || undefined}
              aria-describedby={errors.includes(field) ? `error-${field}` : undefined}
              className="min-h-12 w-full rounded-md border border-field bg-canvas px-4"
            />
            {errors.includes(field) ? (
              <span id={`error-${field}`} className="block text-small text-danger">
                {t('invalid')}
              </span>
            ) : null}
          </label>
        ))}
        <label className="block space-y-2">
          <span>{t('fields.shipping')}</span>
          <select
            id="checkout-shipping"
            name="shipping"
            className="min-h-12 w-full rounded-md border border-field bg-canvas px-4"
          >
            <option value="standard">{t('standard')}</option>
            <option value="express">{t('express')}</option>
          </select>
        </label>
      </div>
      <aside className="h-fit space-y-6 rounded-md bg-surface p-6 md:sticky md:top-24">
        <h2 className="text-h2">{t('summary')}</h2>
        <ul className="space-y-3">
          {lines.map((line) => {
            const product = products.find((p) => p.variants.some((v) => v.sku === line.sku));
            return (
              <li key={`${line.sku}-${line.lookId ?? ''}`} className="flex justify-between gap-4">
                <span>{product?.name[locale]}</span>
                <span>{new Intl.NumberFormat(locale).format(line.qty)}</span>
              </li>
            );
          })}
        </ul>
        <p>{t('total', { amount: formatMoney(price.totalCents, currency, locale) })}</p>
        <p>{t('shippingNote')}</p>
        <p>{t('payment')}</p>
        <Button type="submit" fullWidth>
          {t('submit')}
        </Button>
      </aside>
    </form>
  );
}
