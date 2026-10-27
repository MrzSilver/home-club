import { z } from 'zod';
import { lookSchema, type Look } from './schema';

// Data only in P1; the builder UI ships in P2 (PRD FR-040..FR-044). Product ids refer to products.ts.
const seed: readonly Look[] = [
  {
    id: 'look-essential',
    slug: 'the-essential-look',
    name: { en: 'The Essential Look', th: 'ลุคพื้นฐาน' },
    description: {
      en: 'A tee, a short, a cap and socks, picked to work together.',
      th: 'เสื้อยืด กางเกงขาสั้น หมวก และถุงเท้า คัดมาให้เข้ากัน',
    },
    slots: {
      top: {
        defaultProductId: 'p-essential-tee',
        allowedProductIds: ['p-essential-tee', 'p-premium-hoodie', 'p-performance-long-sleeve'],
      },
      bottom: {
        defaultProductId: 'p-performance-short',
        allowedProductIds: ['p-performance-short', 'p-everyday-jogger', 'p-relaxed-short'],
      },
      cap: {
        defaultProductId: 'p-classic-cap',
        allowedProductIds: ['p-classic-cap', 'p-knit-beanie'],
      },
      socks: {
        defaultProductId: 'p-essential-socks',
        allowedProductIds: ['p-essential-socks', 'p-performance-socks'],
      },
    },
    discountPct: 10,
  },
];

export const LOOKS: readonly Look[] = z.array(lookSchema).parse(seed);
