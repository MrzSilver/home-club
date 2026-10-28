import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Container } from '@/components/ui/container';
import { AwardIcon } from '@/components/ui/icons/award-icon';
import { LeafIcon } from '@/components/ui/icons/leaf-icon';
import { TruckIcon } from '@/components/ui/icons/truck-icon';
import type { Locale } from '@/data/schema';

type TrustStripProps = { locale: Locale };

/**
 * Trust strip (FR-015): quality, responsible materials, fast delivery. The copy is brand voice, not a
 * claim: no country, no certification, no number (RULES 1.3). Stacked on phones, three columns with
 * vertical line separators from md.
 */
export async function TrustStrip({ locale }: TrustStripProps): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'home' });
  const items = [
    {
      id: 'quality',
      icon: AwardIcon,
      title: t('trust.quality.title'),
      caption: t('trust.quality.caption'),
    },
    {
      id: 'materials',
      icon: LeafIcon,
      title: t('trust.materials.title'),
      caption: t('trust.materials.caption'),
    },
    {
      id: 'delivery',
      icon: TruckIcon,
      title: t('trust.delivery.title'),
      caption: t('trust.delivery.caption'),
    },
  ];

  return (
    <section aria-labelledby="trust-heading">
      <h2 id="trust-heading" className="sr-only">
        {t('trust.heading')}
      </h2>
      <Container>
        <ul className="grid gap-6 border-t border-line pt-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
          {items.map(({ id, icon: Icon, title, caption }) => (
            <li key={id} className="flex items-start gap-4 md:px-8 md:first:ps-0 md:last:pe-0">
              <Icon className="size-8 shrink-0" />
              <div>
                <p className="text-eyebrow uppercase-latin">{title}</p>
                <p className="mt-1 text-small text-muted">{caption}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
