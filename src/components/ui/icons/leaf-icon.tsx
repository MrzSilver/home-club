import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function LeafIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M5 19C5 10.5 10 5.5 19.5 4.5 19.5 14 14.5 19 5 19z" />
      <path d="M5 19 14 10" />
    </IconBase>
  );
}
