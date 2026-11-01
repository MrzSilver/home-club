import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function ImageOffIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-9 9" />
    </IconBase>
  );
}
