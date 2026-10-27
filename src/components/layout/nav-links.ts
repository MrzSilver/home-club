import { CATEGORY_ENTRIES } from '@/data/categories';
import type { Locale } from '@/data/schema';

export type NavLink = {
  /** Public path, without locale prefix or currency segment (the i18n `Link` adds the prefix). */
  href: string;
  label: string;
};

type NavLabels = { home: string; shopAll: string };

/** Home and "Shop all": the top of the menu. */
export function primaryLinks(labels: NavLabels): NavLink[] {
  return [
    { href: '/', label: labels.home },
    { href: '/shop', label: labels.shopAll },
  ];
}

/** One link per catalogue category, in catalogue order, named in the page language. */
export function categoryLinks(locale: Locale): NavLink[] {
  return CATEGORY_ENTRIES.map((category) => ({
    href: `/collections/${category.id}`,
    label: category.name[locale],
  }));
}
