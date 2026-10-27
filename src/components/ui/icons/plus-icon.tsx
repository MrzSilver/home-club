import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function PlusIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}
