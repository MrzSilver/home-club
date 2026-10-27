import { z } from 'zod';
import {
  productSchema,
  type Category,
  type Color,
  type Localized,
  type Product,
  type Size,
  type Slot,
  type Variant,
  type Vibe,
} from './schema';

// Swatch colours harmonised with the DESIGN 2.1 palette (sand and forest are the brand tokens).
// Swatch only: hex values never drive text contrast.
const COLORS = {
  sand: { id: 'sand', name: { en: 'Sand', th: 'ทราย' }, hex: '#D6BF9C' },
  black: { id: 'black', name: { en: 'Black', th: 'ดำ' }, hex: '#1F1E1B' },
  forest: { id: 'forest', name: { en: 'Forest', th: 'เขียวป่า' }, hex: '#2B372D' },
  grey: { id: 'grey', name: { en: 'Grey', th: 'เทา' }, hex: '#8C8981' },
  white: { id: 'white', name: { en: 'White', th: 'ขาว' }, hex: '#F4F1EA' },
} as const satisfies Record<string, Color>;

type ColorId = keyof typeof COLORS;

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const satisfies readonly Size[];
const SOCK_SIZES = ['S', 'M', 'L'] as const satisfies readonly Size[];
const ONE_SIZE = ['ONE'] as const satisfies readonly Size[];

// Every generated placeholder is 4:5 (DESIGN 4 gallery ratio); cards crop to 1:1 with object-fit.
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 1500;

interface ProductSeed {
  slug: string;
  category: Category;
  slot?: Slot;
  vibes: readonly Vibe[];
  name: Localized;
  description: Localized;
  priceCents: number;
  createdAt: string;
  tags: readonly string[];
  sizes: readonly Size[];
  // One entry per colour, in display order (the first is the default). Stock is hand-authored and
  // aligned with `sizes`: 0 = sold out, 1-3 = low stock (FR-032), the rest comfortable.
  stock: readonly (readonly [ColorId, readonly number[]])[];
  // Labels for image 1 and image 2 of every colour.
  views: readonly [Localized, Localized];
}

const FRONT_BACK: ProductSeed['views'] = [
  { en: 'front view', th: 'ด้านหน้า' },
  { en: 'back view', th: 'ด้านหลัง' },
];

const seeds: readonly ProductSeed[] = [
  {
    slug: 'essential-tee',
    category: 'foundations',
    slot: 'top',
    vibes: ['lazy', 'skate', 'outdoor'],
    name: { en: 'Essential Tee', th: 'เสื้อยืดพื้นฐาน' },
    description: {
      en: 'A midweight cotton tee with a clean neckline and a relaxed, easy fit.',
      th: 'เสื้อยืดผ้าคอตตอนเนื้อกลาง คอกลมเรียบ ทรงสบาย ใส่ง่ายได้ทุกวัน',
    },
    priceCents: 4900,
    createdAt: '2026-03-02',
    tags: ['tee', 'cotton', 'basics', 'everyday'],
    sizes: APPAREL_SIZES,
    stock: [
      ['sand', [3, 10, 15, 12, 8, 0]],
      ['black', [2, 14, 20, 16, 10, 6]],
      ['white', [4, 12, 18, 14, 9, 5]],
      ['forest', [5, 9, 13, 11, 6, 3]],
    ],
    views: FRONT_BACK,
  },
  {
    slug: 'premium-hoodie',
    category: 'foundations',
    slot: 'top',
    vibes: ['lazy', 'outdoor', 'skate'],
    name: { en: 'Premium Hoodie', th: 'ฮู้ดดี้พรีเมียม' },
    description: {
      en: 'A heavyweight brushed-fleece hoodie with a roomy hood and a deep front pocket.',
      th: 'ฮู้ดดี้ผ้าสำลีหนานุ่ม ฮู้ดใหญ่ กระเป๋าหน้าลึก ใส่อุ่นสบาย',
    },
    priceCents: 8900,
    createdAt: '2026-04-14',
    tags: ['hoodie', 'fleece', 'layer', 'heavyweight'],
    sizes: APPAREL_SIZES,
    stock: [
      ['black', [5, 9, 14, 12, 8, 4]],
      ['grey', [4, 8, 12, 10, 6, 2]],
      ['forest', [3, 6, 1, 7, 5, 0]],
      ['sand', [4, 7, 10, 9, 5, 3]],
    ],
    views: FRONT_BACK,
  },
  {
    slug: 'essential-socks',
    category: 'foundations',
    slot: 'socks',
    vibes: ['lazy', 'skate'],
    name: { en: 'Essential Crew Socks', th: 'ถุงเท้าข้อกลางพื้นฐาน' },
    description: {
      en: 'Soft cotton-blend crew socks with a cushioned sole, made for every day.',
      th: 'ถุงเท้าข้อกลางผ้าคอตตอนผสม พื้นนุ่ม ใส่สบายตลอดวัน',
    },
    priceCents: 1900,
    createdAt: '2026-03-20',
    tags: ['socks', 'crew', 'cotton', 'basics'],
    sizes: SOCK_SIZES,
    stock: [
      ['white', [20, 30, 24]],
      ['black', [25, 36, 28]],
      ['grey', [12, 18, 0]],
    ],
    views: [
      { en: 'pair, front view', th: 'หนึ่งคู่ ด้านหน้า' },
      { en: 'single sock, detail view', th: 'ถุงเท้าข้างเดียว ภาพใกล้' },
    ],
  },
  {
    slug: 'performance-short',
    category: 'performance',
    slot: 'bottom',
    vibes: ['performance', 'hockey'],
    name: { en: 'Performance Short', th: 'กางเกงขาสั้นออกกำลังกาย' },
    description: {
      en: 'Lightweight stretch shorts with a drawcord waist and quick-dry fabric for training days.',
      th: 'กางเกงขาสั้นผ้ายืดเบา แห้งไว เอวผูกเชือก เหมาะกับวันออกกำลังกาย',
    },
    priceCents: 5900,
    createdAt: '2026-05-06',
    tags: ['short', 'training', 'quick-dry', 'stretch'],
    sizes: APPAREL_SIZES,
    stock: [
      ['black', [6, 15, 20, 18, 12, 7]],
      ['forest', [4, 10, 14, 12, 8, 0]],
      ['grey', [5, 11, 16, 13, 9, 6]],
    ],
    views: FRONT_BACK,
  },
  {
    slug: 'performance-long-sleeve',
    category: 'performance',
    slot: 'top',
    vibes: ['performance', 'hockey', 'outdoor'],
    name: { en: 'Performance Long Sleeve', th: 'เสื้อแขนยาวออกกำลังกาย' },
    description: {
      en: 'A breathable long-sleeve top with flat seams and a close, athletic fit.',
      th: 'เสื้อแขนยาวผ้าระบายอากาศ ตะเข็บเรียบ ทรงพอดีตัว ขยับคล่อง',
    },
    priceCents: 6500,
    createdAt: '2026-06-18',
    tags: ['long-sleeve', 'training', 'breathable', 'base-layer'],
    sizes: APPAREL_SIZES,
    stock: [
      ['black', [4, 10, 14, 12, 8, 3]],
      ['grey', [3, 8, 11, 9, 6, 4]],
      ['forest', [0, 5, 9, 8, 4, 2]],
    ],
    views: FRONT_BACK,
  },
  {
    slug: 'performance-socks',
    category: 'performance',
    slot: 'socks',
    vibes: ['performance', 'hockey'],
    name: { en: 'Performance Socks', th: 'ถุงเท้าออกกำลังกาย' },
    description: {
      en: 'Lightweight sport socks with a mesh instep and a snug, supportive heel.',
      th: 'ถุงเท้าสปอร์ตเนื้อบาง ด้านบนเป็นผ้าตาข่าย ส้นกระชับ รองรับดี',
    },
    priceCents: 2400,
    createdAt: '2026-06-18',
    tags: ['socks', 'sport', 'mesh', 'running'],
    sizes: SOCK_SIZES,
    stock: [
      ['black', [14, 22, 16]],
      ['white', [9, 15, 2]],
    ],
    views: [
      { en: 'pair, front view', th: 'หนึ่งคู่ ด้านหน้า' },
      { en: 'single sock, detail view', th: 'ถุงเท้าข้างเดียว ภาพใกล้' },
    ],
  },
  {
    slug: 'everyday-jogger',
    category: 'lifestyle',
    slot: 'bottom',
    vibes: ['lazy', 'skate'],
    name: { en: 'Everyday Jogger', th: 'กางเกงจ๊อกเกอร์ใส่ทุกวัน' },
    description: {
      en: 'A soft, tapered jogger in brushed cotton with an elastic waist and ribbed cuffs.',
      th: 'กางเกงจ๊อกเกอร์ทรงเรียว ผ้าคอตตอนนุ่ม เอวยางยืด ปลายขารัดข้อ',
    },
    priceCents: 7900,
    createdAt: '2026-07-09',
    tags: ['jogger', 'pants', 'cotton', 'tapered'],
    sizes: APPAREL_SIZES,
    stock: [
      ['black', [5, 12, 16, 14, 9, 5]],
      ['sand', [3, 8, 11, 9, 6, 0]],
      ['forest', [4, 9, 13, 10, 7, 3]],
      // Grey is fully sold out: exercises the "colour unavailable" state. It is not listed first
      // because the first colour is the default on cards and the product page.
      ['grey', [0, 0, 0, 0, 0, 0]],
    ],
    views: FRONT_BACK,
  },
  {
    slug: 'coach-jacket',
    category: 'lifestyle',
    vibes: ['outdoor', 'skate'],
    name: { en: 'Coach Jacket', th: 'แจ็กเก็ตโค้ช' },
    description: {
      en: 'A lightweight snap-front jacket with a flat collar and two side pockets. Easy over anything.',
      th: 'แจ็กเก็ตน้ำหนักเบา กระดุมแป๊กด้านหน้า ปกเรียบ มีกระเป๋าข้างสองใบ ใส่ทับได้กับทุกชุด',
    },
    priceCents: 12900,
    createdAt: '2026-08-12',
    tags: ['jacket', 'coach', 'lightweight', 'layer'],
    sizes: APPAREL_SIZES,
    stock: [
      ['black', [3, 7, 10, 9, 6, 3]],
      ['sand', [2, 5, 8, 7, 4, 0]],
      ['forest', [3, 6, 9, 8, 5, 2]],
    ],
    views: FRONT_BACK,
  },
  {
    slug: 'relaxed-short',
    category: 'lifestyle',
    slot: 'bottom',
    vibes: ['lazy', 'skate', 'outdoor'],
    name: { en: 'Relaxed Short', th: 'กางเกงขาสั้นทรงหลวม' },
    description: {
      en: 'A relaxed, knee-length short in soft cotton twill with side pockets.',
      th: 'กางเกงขาสั้นทรงหลวมยาวถึงเข่า ผ้าทวิลคอตตอนนุ่ม มีกระเป๋าข้าง',
    },
    priceCents: 5400,
    createdAt: '2026-07-28',
    tags: ['short', 'twill', 'relaxed', 'pockets'],
    sizes: APPAREL_SIZES,
    stock: [
      ['sand', [4, 9, 12, 10, 7, 4]],
      ['forest', [3, 7, 10, 8, 5, 2]],
      ['black', [5, 10, 14, 12, 8, 5]],
    ],
    views: FRONT_BACK,
  },
  {
    slug: 'classic-cap',
    category: 'accessories',
    slot: 'cap',
    vibes: ['skate', 'outdoor', 'lazy'],
    name: { en: 'Classic Cap', th: 'หมวกแก๊ปคลาสสิก' },
    description: {
      en: 'A six-panel cotton cap with a curved brim and an adjustable strap.',
      th: 'หมวกแก๊ปผ้าคอตตอนตัดต่อหกส่วน ปีกโค้ง ปรับสายด้านหลังได้',
    },
    priceCents: 3900,
    createdAt: '2026-03-30',
    tags: ['cap', 'cotton', 'adjustable', 'hat'],
    sizes: ONE_SIZE,
    stock: [
      ['sand', [3]],
      ['black', [24]],
      ['forest', [11]],
      ['white', [8]],
    ],
    views: [
      { en: 'side view', th: 'ด้านข้าง' },
      { en: 'front view', th: 'ด้านหน้า' },
    ],
  },
  {
    slug: 'knit-beanie',
    category: 'accessories',
    slot: 'cap',
    vibes: ['outdoor', 'lazy', 'hockey'],
    name: { en: 'Knit Beanie', th: 'หมวกไหมพรม' },
    description: {
      en: 'A ribbed knit beanie with a folded cuff. Warm without the bulk.',
      th: 'หมวกไหมพรมถักลายร่อง พับขอบได้ อุ่นแต่ไม่หนาเทอะทะ',
    },
    priceCents: 3200,
    createdAt: '2026-09-04',
    tags: ['beanie', 'knit', 'ribbed', 'hat'],
    sizes: ONE_SIZE,
    stock: [
      ['black', [18]],
      ['grey', [9]],
      ['sand', [2]],
    ],
    views: FRONT_BACK,
  },
  {
    slug: 'canvas-tote',
    category: 'accessories',
    vibes: ['outdoor', 'lazy'],
    name: { en: 'Canvas Tote', th: 'กระเป๋าผ้าแคนวาส' },
    description: {
      en: 'A sturdy cotton canvas tote with long handles and room for a day of essentials.',
      th: 'กระเป๋าผ้าแคนวาสทรงโท้ต หูยาว จุของจำเป็นประจำวันได้พอดี',
    },
    priceCents: 3500,
    createdAt: '2026-09-22',
    tags: ['tote', 'bag', 'canvas', 'carry'],
    sizes: ONE_SIZE,
    stock: [
      ['sand', [14]],
      ['black', [7]],
    ],
    views: FRONT_BACK,
  },
];

function buildProduct(seed: ProductSeed): Product {
  for (const [colorId, stocks] of seed.stock) {
    if (stocks.length !== seed.sizes.length) {
      throw new Error(
        `Seed error: ${seed.slug} ${colorId} has ${stocks.length} stock entries for ${seed.sizes.length} sizes`,
      );
    }
  }
  const colors = seed.stock.map(([colorId]) => COLORS[colorId]);
  const variants: Variant[] = seed.stock.flatMap(([colorId, stocks]) =>
    seed.sizes.map((size, index) => {
      const stock = stocks[index];
      if (stock === undefined) {
        throw new Error(`Seed error: ${seed.slug} ${colorId} has no stock entry for size ${size}`);
      }
      return { sku: `${seed.slug}-${colorId}-${size}`, colorId, size, stock };
    }),
  );
  const images = colors.flatMap((color) =>
    seed.views.map((view, index) => ({
      colorId: color.id,
      src: `/images/products/${seed.slug}/${color.id}-${index + 1}.webp`,
      alt: {
        en: `${seed.name.en}, ${color.name.en.toLowerCase()}, ${view.en}`,
        th: `${seed.name.th} สี${color.name.th} ${view.th}`,
      },
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
    })),
  );
  return {
    id: `p-${seed.slug}`,
    slug: seed.slug,
    category: seed.category,
    ...(seed.slot === undefined ? {} : { slot: seed.slot }),
    vibes: [...seed.vibes],
    name: seed.name,
    description: seed.description,
    priceCents: seed.priceCents,
    colors: [...colors],
    variants,
    images,
    tags: [...seed.tags],
    createdAt: seed.createdAt,
  };
}

// Parsed at module load so a bad seed fails fast at build and in tests (RULES 7.6).
// Array order is the "featured" order used by the catalogue.
export const PRODUCTS: readonly Product[] = z.array(productSchema).parse(seeds.map(buildProduct));

// Home "Essentials" grid (FR-012): tee, hoodie, short, cap, as in the mock-up.
export const FEATURED_ESSENTIAL_IDS: readonly string[] = [
  'p-essential-tee',
  'p-premium-hoodie',
  'p-performance-short',
  'p-classic-cap',
];
