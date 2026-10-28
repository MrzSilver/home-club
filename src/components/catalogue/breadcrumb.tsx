import type { ReactElement } from 'react';

import { ChevronRightIcon } from '@/components/ui/icons/chevron-right-icon';
import { Link } from '@/i18n/navigation';

export type Crumb = {
  label: string;
  /** Public path; omitted for the current page. */
  href?: string;
  prefetch?: boolean;
};

type BreadcrumbProps = { label: string; crumbs: readonly Crumb[] };

const ITEM = 'inline-flex min-h-11 items-center';

/** Where the visitor is (Home › Shop › Foundations). The last crumb is the page and is not a link. */
export function Breadcrumb({ label, crumbs }: BreadcrumbProps): ReactElement {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center text-small text-muted">
        {crumbs.map((crumb, index) => (
          <li key={crumb.label} className="flex items-center">
            {index === 0 ? null : <ChevronRightIcon className="mx-1 size-4 shrink-0" />}
            {crumb.href === undefined ? (
              <span aria-current="page" className={`${ITEM} text-ink`}>
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                prefetch={crumb.prefetch ?? false}
                className={`${ITEM} rounded-sm underline underline-offset-4 hover:text-ink`}
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
