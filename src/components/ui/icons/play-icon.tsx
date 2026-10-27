import type { ReactElement } from 'react';

import { IconBase, type IconProps } from './icon-base';

export function PlayIcon(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M8 5.5v13l10.5-6.5z" />
    </IconBase>
  );
}
