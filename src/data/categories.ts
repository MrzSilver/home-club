import { z } from 'zod';
import { categoryEntrySchema, type CategoryEntry } from './schema';

// Licensed Pexels fashion photography (docs/ASSETS.md); 3:2 per DESIGN 4.
const TILE = { width: 1200, height: 800 } as const;

const seed: readonly CategoryEntry[] = [
  {
    id: 'foundations',
    name: { en: 'Foundations', th: 'ไอเท็มพื้นฐาน' },
    subtitle: { en: 'The basics', th: 'ชิ้นพื้นฐานที่ใส่ได้ทุกวัน' },
    image: {
      src: '/images/categories/foundations.webp',
      alt: {
        en: 'Two models standing back to back in beige tops beside tall studio windows',
        th: 'นายแบบและนางแบบสวมเสื้อสีเบจยืนหันหลังชนกันข้างหน้าต่างสูงในสตูดิโอ',
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
        en: 'A model wearing a beige sports bra and cycling shorts in natural light',
        th: 'นางแบบสวมสปอร์ตบรากับกางเกงขาสั้นแนบตัวสีเบจในแสงธรรมชาติ',
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
        en: 'A model wearing a white hoodie against a warm grey studio backdrop',
        th: 'นายแบบสวมฮู้ดดี้สีขาวในสตูดิโอฉากสีเทาโทนอุ่น',
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
        en: 'A model in a black sweatshirt holding a plain cream canvas tote on a beige backdrop',
        th: 'นายแบบสวมเสื้อสเวตเชิ้ตสีดำถือกระเป๋าผ้าแคนวาสสีครีมเรียบบนฉากสีเบจ',
      },
      ...TILE,
    },
  },
];

export const CATEGORY_ENTRIES: readonly CategoryEntry[] = z.array(categoryEntrySchema).parse(seed);
