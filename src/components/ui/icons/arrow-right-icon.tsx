import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function ArrowRightIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </IconBase>
  );
}
