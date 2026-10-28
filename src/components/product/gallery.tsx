'use client';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRef, type ReactElement } from 'react';
import type { Locale, ProductImage } from '@/data/schema';

export function Gallery({
  images,
  locale,
}: {
  images: ProductImage[];
  locale: Locale;
}): ReactElement {
  const t = useTranslations('product');
  const track = useRef<HTMLDivElement>(null);
  return (
    <section aria-label={t('gallery')} className="min-w-0 md:sticky md:top-24 md:self-start">
      <div
        ref={track}
        role="region"
        tabIndex={images.length > 1 ? 0 : -1}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-md bg-surface"
        aria-label={t('swipe')}
      >
        {images.map((image, index) => (
          <div key={image.src} className="relative aspect-gallery w-full shrink-0 snap-center">
            <Image
              src={image.src}
              alt={image.alt[locale]}
              width={image.width}
              height={image.height}
              sizes="(min-width: 80rem) 600px, (min-width: 48rem) 50vw, 100vw"
              priority={index === 0}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            aria-label={t('image', { number: index + 1 })}
            onClick={() => {
              const frame = track.current?.children.item(index);
              if (frame instanceof HTMLElement)
                track.current?.scrollTo({
                  left:
                    frame.offsetLeft -
                    (track.current.firstElementChild instanceof HTMLElement
                      ? track.current.firstElementChild.offsetLeft
                      : 0),
                  behavior: 'instant',
                });
            }}
            className="size-16 shrink-0 overflow-hidden rounded-sm border border-field"
          >
            <Image
              src={image.src}
              alt=""
              width={image.width}
              height={image.height}
              sizes="64px"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
