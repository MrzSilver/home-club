import type { MetadataRoute } from 'next';
import { LOCALES } from '@/data/locales';
import { JOURNAL_SLUGS } from '@/content/journal';
import { sitemapEntries } from '@/lib/sitemap';

// Every article ships an MDX file in each locale (src/content/journal/{en,th}), so all locales apply.
export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(JOURNAL_SLUGS.map((slug) => ({ slug, locales: LOCALES })));
}
