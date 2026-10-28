import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

type AsyncComponent = (props: Record<string, unknown>) => Promise<ReactNode>;

const isAsyncComponent = (type: unknown): type is AsyncComponent =>
  typeof type === 'function' && type.constructor.name === 'AsyncFunction';

/**
 * Server Components that are `async` cannot be rendered by Testing Library. This awaits every async
 * component in a tree (what Next.js does on the server) and leaves sync and client components alone,
 * so a whole page can be rendered and asserted on.
 */
export async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServerTree));
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<{ children?: ReactNode }>;
  if (isAsyncComponent(element.type)) {
    const rendered = await element.type(element.props as Record<string, unknown>);
    return resolveServerTree(rendered);
  }
  const { children } = element.props;
  if (children === undefined) return element;
  const resolved = await Promise.all(Children.toArray(children).map(resolveServerTree));
  return cloneElement(element, undefined, ...resolved);
}
