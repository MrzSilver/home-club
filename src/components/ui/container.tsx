import type { ReactElement, ReactNode } from 'react';

type ContainerElement = 'div' | 'section' | 'header' | 'footer' | 'main' | 'nav';

type ContainerProps = {
  as?: ContainerElement;
  className?: string;
  children: ReactNode;
};

/** Page container: max 1280px, side padding 16 / 24 / 40px by breakpoint (DESIGN 4). */
export function Container({ as: Tag = 'div', className, children }: ContainerProps): ReactElement {
  return (
    <Tag className={['mx-auto w-full max-w-page px-gutter', className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  );
}
