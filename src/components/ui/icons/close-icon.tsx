import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function CloseIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </IconBase>
  );
}
