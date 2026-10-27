import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function MenuIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}
