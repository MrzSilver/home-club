import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { ComponentType } from 'react';
import type { Locale } from '@/data/schema';

export const JOURNAL_SLUGS = ['everyday-layers', 'care-for-basics', 'one-set-many-days'] as const;
const metaSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string().min(1),
  related: z.array(z.string().min(1)).min(1),
});
const imports = {
  en: {
    'everyday-layers': () => import('./journal/en/everyday-layers.mdx'),
    'care-for-basics': () => import('./journal/en/care-for-basics.mdx'),
    'one-set-many-days': () => import('./journal/en/one-set-many-days.mdx'),
  },
  th: {
    'everyday-layers': () => import('./journal/th/everyday-layers.mdx'),
    'care-for-basics': () => import('./journal/th/care-for-basics.mdx'),
    'one-set-many-days': () => import('./journal/th/one-set-many-days.mdx'),
  },
};
export async function getArticle(
  locale: Locale,
  slug: (typeof JOURNAL_SLUGS)[number],
): Promise<{
  slug: string;
  meta: z.infer<typeof metaSchema>;
  minutes: number;
  Content: ComponentType;
}> {
  const article = await imports[locale][slug]();
  const source = readFileSync(
    join(process.cwd(), 'src/content/journal', locale, `${slug}.mdx`),
    'utf8',
  ).replace(/^export const meta.*$/m, '');
  const words = [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(source)].filter(
    (segment) => segment.isWordLike,
  ).length;
  return {
    slug,
    meta: metaSchema.parse('meta' in article ? article.meta : undefined),
    minutes: Math.max(1, Math.ceil(words / 200)),
    Content: article.default,
  };
}
