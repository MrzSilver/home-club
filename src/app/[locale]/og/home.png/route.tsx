import { renderOgImage } from '@/components/og/og-image';
import { LOCALES } from '@/data/locales';
import { localeFromParam } from '@/i18n/params';

// Default Open Graph image (docs/adr/0011-og-images.md): every page without an image of its own.
type Context = { params: Promise<{ locale: string }> };

export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  return renderOgImage({ locale: localeFromParam((await params).locale) });
}
