import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function BagIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M5.5 8.5h13l1 11.5h-15z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </IconBase>
  );
}
