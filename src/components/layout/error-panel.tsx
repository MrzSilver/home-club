'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, type ReactElement } from 'react';

import { Button, buttonClasses } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Link } from '@/i18n/navigation';

// Body of the route error boundary, imported statically by `app/[locale]/error.tsx`.
export function ErrorPanel({ reset }: { reset: () => void }): ReactElement {
  const t = useTranslations('errorPage');
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <Container as="main" className="py-12 md:py-16">
      <div id="main" tabIndex={-1} className="space-y-4">
        <h1 ref={heading} tabIndex={-1} className="w-fit text-h1 uppercase-latin">
          {t('title')}
        </h1>
        <p className="max-w-prose text-body text-muted">{t('body')}</p>
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Button onClick={reset}>{t('retry')}</Button>
          <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
            {t('backHome')}
          </Link>
        </div>
      </div>
    </Container>
  );
}
