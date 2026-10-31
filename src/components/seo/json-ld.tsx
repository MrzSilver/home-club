import type { ReactElement } from 'react';

import { serializeJsonLd, type JsonLd as JsonLdValue } from '@/lib/structured-data';

type JsonLdProps = {
  data: JsonLdValue | readonly JsonLdValue[];
};

/**
 * The single place that writes structured data into the page (RULES 10.3, FR-036). `serializeJsonLd`
 * escapes `<`, `>`, `&` and U+2028/2029, so no string in `data` can end the script element. The
 * element is data, not executable code, so the CSP does not apply to it.
 */
export function JsonLd({ data }: JsonLdProps): ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
