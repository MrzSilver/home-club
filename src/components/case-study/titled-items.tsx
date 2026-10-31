import type { ReactElement } from 'react';

export type TitledItem = { id: string; title: string; body: string };

/** Cards with an h3 title and a short paragraph (constraints, trade-offs). */
export function TitledItems({ items }: { items: TitledItem[] }): ReactElement {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} className="space-y-2 rounded-md bg-surface p-6">
          <h3 className="text-h3">{item.title}</h3>
          <p>{item.body}</p>
        </li>
      ))}
    </ul>
  );
}
