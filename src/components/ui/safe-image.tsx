'use client';
import Image, { type ImageProps } from 'next/image';
import { useState, type ReactElement } from 'react';

import { ImageOffIcon } from '@/components/ui/icons/image-off-icon';

type SafeImageProps = Omit<ImageProps, 'alt' | 'ref'> & { alt: string };

/*
  `next/image` that degrades to a neutral surface box when the file cannot be loaded (SPEC 13a).
  The box keeps the image's className (so its size and aspect ratio), and a meaningful `alt` stays
  available as `role="img"` + `aria-label`, announced once. A decorative image (`alt=""`) becomes
  an empty, hidden box. `onError` cannot fire for a failure that happens before hydration, so the
  ref callback also checks the already-finished-and-broken state when the element attaches.
*/
export function SafeImage({ alt, className, onError, ...rest }: SafeImageProps): ReactElement {
  // The failure belongs to one source: a new `src` (e.g. another colour in a look slot) tries again.
  const [failedSrc, setFailedSrc] = useState<ImageProps['src'] | null>(null);
  if (failedSrc !== null && failedSrc === rest.src) {
    const decorative = alt === '';
    return (
      <span
        {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': alt })}
        data-image-fallback=""
        className={`flex items-center justify-center bg-surface text-muted ${className ?? ''}`}
      >
        {decorative ? null : <ImageOffIcon className="size-6" />}
      </span>
    );
  }
  return (
    <Image
      {...rest}
      alt={alt}
      {...(className === undefined ? {} : { className })}
      ref={(img) => {
        if (img?.complete === true && img.naturalWidth === 0) setFailedSrc(rest.src);
      }}
      onError={(event) => {
        setFailedSrc(rest.src);
        onError?.(event);
      }}
    />
  );
}
