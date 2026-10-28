import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function FiltersIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </IconBase>
  );
}
