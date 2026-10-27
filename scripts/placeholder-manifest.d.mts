// Types for placeholder-manifest.mjs so tests can import it without enabling allowJs.
export const PRODUCT_IMAGE_SIZE: { readonly width: number; readonly height: number };
export const HERO_IMAGE_SIZE: { readonly width: number; readonly height: number };
export const CATEGORY_IMAGE_SIZE: { readonly width: number; readonly height: number };
export const COLORS: Readonly<Record<string, string>>;
export const PRODUCT_IMAGES: readonly {
  readonly slug: string;
  readonly garment: string;
  readonly colors: readonly string[];
}[];
export const HERO_SCENES: readonly string[];
export const CATEGORY_TILES: readonly string[];
