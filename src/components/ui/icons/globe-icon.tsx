import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function GlobeIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </IconBase>
  );
}
