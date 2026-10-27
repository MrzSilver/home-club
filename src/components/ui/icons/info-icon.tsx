import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function InfoIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </IconBase>
  );
}
