import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function MinusIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
    </IconBase>
  );
}
