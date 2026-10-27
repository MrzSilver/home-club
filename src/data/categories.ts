import { z } from 'zod';
import { categoryEntrySchema, type CategoryEntry } from './schema';

// Tile images are generated placeholders (docs/ASSETS.md); 3:2 per DESIGN 4.
const TILE = { width: 1200, height: 800 } as const;

const seed: readonly CategoryEntry[] = [
  {
    id: 'foundations',
    name: { en: 'Foundations', th: 'ไอเท็มพื้นฐาน' },
    subtitle: { en: 'The basics', th: 'ชิ้นพื้นฐานที่ใส่ได้ทุกวัน' },
    image: {
      src: '/images/categories/foundations.webp',
      alt: {
        en: 'A white tee and a black tee laid out on a warm sand backdrop',
        th: 'เสื้อยืดสีขาวและสีดำวางบนฉากโทนทราย',
      },
      ...TILE,
    },
  },
  {
    id: 'performance',
    name: { en: 'Performance', th: 'ออกกำลังกาย' },
    subtitle: { en: 'Made to move', th: 'ขยับได้เต็มที่' },
    image: {
      src: '/images/categories/performance.webp',
      alt: {
        en: 'A grey long-sleeve top and a black training short on a deep forest backdrop',
        th: 'เสื้อแขนยาวสีเทาและกางเกงขาสั้นออกกำลังกายสีดำ บนฉากสีเขียวเข้ม',
      },
      ...TILE,
    },
  },
  {
    id: 'lifestyle',
    name: { en: 'Lifestyle', th: 'ไลฟ์สไตล์' },
    subtitle: { en: 'Easy days', th: 'สบาย ๆ ทุกวัน' },
    image: {
      src: '/images/categories/lifestyle.webp',
      alt: {
        en: 'A grey hoodie and a sand jogger on a warm stone backdrop',
        th: 'ฮู้ดดี้สีเทาและกางเกงจ๊อกเกอร์สีทรายบนฉากโทนหินอุ่น',
      },
      ...TILE,
    },
  },
  {
    id: 'accessories',
    name: { en: 'Accessories', th: 'แอคเซสซอรี่' },
    subtitle: { en: 'The finishing touch', th: 'แต่งเติมให้ลงตัว' },
    image: {
      src: '/images/categories/accessories.webp',
      alt: {
        en: 'A white cap and a sand canvas tote on a dark backdrop',
        th: 'หมวกแก๊ปสีขาวและกระเป๋าผ้าแคนวาสสีทรายบนฉากสีเข้ม',
      },
      ...TILE,
    },
  },
];

export const CATEGORY_ENTRIES: readonly CategoryEntry[] = z.array(categoryEntrySchema).parse(seed);
