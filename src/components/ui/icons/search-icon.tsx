import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function SearchIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </IconBase>
  );
}
