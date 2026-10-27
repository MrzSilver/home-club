import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function CheckIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </IconBase>
  );
}
