// What the placeholder generator draws. Kept free of sharp so tests can import it and check it against
// the seed catalogue (colour hex values and image paths must match src/data/products.ts).

export const PRODUCT_IMAGE_SIZE = { width: 1200, height: 1500 };
export const HERO_IMAGE_SIZE = { width: 1920, height: 1080 };
export const CATEGORY_IMAGE_SIZE = { width: 1200, height: 800 };

// Swatch colours: must equal the hex values in src/data/products.ts.
export const COLORS = {
  sand: '#D6BF9C',
  black: '#1F1E1B',
  forest: '#2B372D',
  grey: '#8C8981',
  white: '#F4F1EA',
};

// Two images per colour: n=1 front view, n=2 alternate view (back, side or detail).
export const PRODUCT_IMAGES = [
  { slug: 'essential-tee', garment: 'tee', colors: ['sand', 'black', 'white', 'forest'] },
  { slug: 'premium-hoodie', garment: 'hoodie', colors: ['black', 'grey', 'forest', 'sand'] },
  { slug: 'essential-socks', garment: 'socks', colors: ['white', 'black', 'grey'] },
  { slug: 'performance-short', garment: 'short', colors: ['black', 'forest', 'grey'] },
  { slug: 'performance-long-sleeve', garment: 'longsleeve', colors: ['black', 'grey', 'forest'] },
  { slug: 'performance-socks', garment: 'socks', colors: ['black', 'white'] },
  { slug: 'everyday-jogger', garment: 'jogger', colors: ['black', 'sand', 'forest', 'grey'] },
  { slug: 'coach-jacket', garment: 'jacket', colors: ['black', 'sand', 'forest'] },
  { slug: 'relaxed-short', garment: 'relaxedshort', colors: ['sand', 'forest', 'black'] },
  { slug: 'classic-cap', garment: 'cap', colors: ['sand', 'black', 'forest', 'white'] },
  { slug: 'knit-beanie', garment: 'beanie', colors: ['black', 'grey', 'sand'] },
  { slug: 'canvas-tote', garment: 'tote', colors: ['sand', 'black'] },
];

export const HERO_SCENES = ['hero-1', 'hero-2', 'hero-3'];
export const CATEGORY_TILES = ['foundations', 'performance', 'lifestyle', 'accessories'];
