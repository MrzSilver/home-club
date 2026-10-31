import { notFound } from 'next/navigation';

import { renderOgImage } from '@/components/og/og-image';
import { LOCALES } from '@/data/locales';
import { localeFromParam } from '@/i18n/params';
import { getAllProducts, getCategory, getProductBySlug } from '@/lib/catalogue';

// Product Open Graph image: name, category and colour swatches, no price (the visitor's currency is
// unknown here) and no photograph (Satori cannot decode WebP; docs/adr/0011-og-images.md).
type Context = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams(): { locale: string; slug: string }[] {
  return LOCALES.flatMap((locale) => getAllProducts().map(({ slug }) => ({ locale, slug })));
}

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { locale: rawLocale, slug } = await params;
  const locale = localeFromParam(rawLocale);
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const category = getCategory(product.category);
  return renderOgImage({
    locale,
    title: product.name.en,
    ...(category ? { eyebrow: category.name.en } : {}),
    swatches: product.colors.map((color) => color.hex),
  });
}
