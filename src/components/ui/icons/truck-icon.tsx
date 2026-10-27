import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function TruckIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M2.5 6.5h10.5v10H2.5zM13 9.5h4l3.5 3.5v3.5H13" />
      <circle cx="7" cy="17.5" r="1.75" />
      <circle cx="16.5" cy="17.5" r="1.75" />
    </IconBase>
  );
}
