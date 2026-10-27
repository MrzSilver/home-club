import type { ReactElement } from 'react';

import { InfoIcon } from '@/components/ui/icons/info-icon';

/**
 * "Demo store - nothing is sold" (DESIGN 5.11): `surface` panel, `ink` text, icon. The icon is
 * decorative; the sentence carries the meaning. Non-dismissible, because it is the honest label
 * of the whole site (RULES 1.4).
 */
export function DemoNotice({ children }: { children: string }): ReactElement {
  return (
    <p className="flex items-start gap-2 rounded-md bg-surface px-4 py-3 text-small text-ink">
      <InfoIcon className="mt-0.5 size-5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
