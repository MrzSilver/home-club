import type { NavLink } from '@/components/layout/nav-links';
import type { Locale } from '@/data/schema';
import type { Currency } from '@/lib/money';

/** Everything the menu needs, as plain data the server builds (RULES 6.1: no copy in components). */
export type MobileNavContent = {
  openLabel: string;
  closeLabel: string;
  title: string;
  navLabel: string;
  primary: NavLink[];
  categoriesHeading: string;
  categories: NavLink[];
  localeLabel: string;
  localeNames: Record<Locale, string>;
  currencyLabel: string;
  currencyNames: Record<Currency, string>;
  currencyAnnouncements: Record<Currency, string>;
};
