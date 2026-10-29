import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';
import { CATEGORY_ENTRIES } from '@/data/categories';
import { Container } from '@/components/ui/container';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/data/schema';

export async function EditorialTeaser({ locale }: { locale: Locale }): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'content' });
  const image = CATEGORY_ENTRIES[2]?.image;
  return (
    <Container>
      <section
        aria-labelledby="editorial-heading"
        className="grid items-center gap-8 md:grid-cols-2"
      >
        {image ? (
          <Image
            src={image.src}
            alt={image.alt[locale]}
            width={image.width}
            height={image.height}
            sizes="(min-width: 768px) 45vw, 90vw"
            className="aspect-video w-full rounded-md object-cover"
          />
        ) : null}
        <div className="space-y-4">
          <h2 id="editorial-heading" className="text-h2">
            {t('journal')}
          </h2>
          <p>{t('journalDescription')}</p>
          <Link
            href="/journal"
            prefetch={false}
            className={buttonClasses({ variant: 'secondary' })}
          >
            {t('read')}
          </Link>
        </div>
      </section>
    </Container>
  );
}
