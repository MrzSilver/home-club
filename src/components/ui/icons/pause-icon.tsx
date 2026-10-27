import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function PauseIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <rect x="6.5" y="5" width="3.5" height="14" rx="0.75" />
      <rect x="14" y="5" width="3.5" height="14" rx="0.75" />
    </IconBase>
  );
}
