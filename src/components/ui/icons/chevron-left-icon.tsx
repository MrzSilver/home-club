import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function ChevronLeftIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="m14.5 6-6 6 6 6" />
    </IconBase>
  );
}
