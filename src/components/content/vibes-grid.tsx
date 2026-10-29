import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';
import { VIBE_ENTRIES } from '@/data/vibes';
import { CATEGORY_ENTRIES } from '@/data/categories';
import type { Locale } from '@/data/schema';
import { Link } from '@/i18n/navigation';

export async function VibesGrid({ locale }: { locale: Locale }): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'content' });
  return (
    <section aria-labelledby="vibes-heading" className="space-y-6">
      <h2 id="vibes-heading" className="text-h2">
        {t('vibes')}
      </h2>
      <ul className="flex snap-x gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-5">
        {VIBE_ENTRIES.map((vibe, index) => {
          const image = CATEGORY_ENTRIES[index % CATEGORY_ENTRIES.length]?.image;
          return (
            <li key={vibe.id} className="min-w-0 shrink-0 basis-48 snap-start">
              <Link href={`/vibes/${vibe.id}`} prefetch={false} className="block space-y-3">
                {image ? (
                  <Image
                    src={image.src}
                    alt={image.alt[locale]}
                    width={image.width}
                    height={image.height}
                    sizes="(min-width: 768px) 20vw, 192px"
                    className="aspect-[4/5] w-full rounded-md object-cover"
                  />
                ) : null}
                <h3 className="text-h3">{vibe.name[locale]}</h3>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
