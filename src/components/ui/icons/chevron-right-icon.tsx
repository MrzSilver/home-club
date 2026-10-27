import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function ChevronRightIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </IconBase>
  );
}
