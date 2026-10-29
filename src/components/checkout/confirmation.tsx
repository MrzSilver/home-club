'use client';
import { Suspense, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { parseDemoOrder } from '@/lib/checkout';

function Order(): ReactElement {
  const t = useTranslations('checkout');
  const query = useSearchParams().get('order') ?? '';
  const order = parseDemoOrder(query);
  return <p role="status">{order ? t('order', { number: order }) : t('noOrder')}</p>;
}
export function Confirmation(): ReactElement {
  return (
    <Suspense>
      <Order />
    </Suspense>
  );
}
