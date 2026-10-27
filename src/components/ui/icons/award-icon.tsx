import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function AwardIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m8.8 13.4-1.3 7.1 4.5-2.5 4.5 2.5-1.3-7.1" />
    </IconBase>
  );
}
