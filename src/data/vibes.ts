import { z } from 'zod';
import { vibeEntrySchema, type VibeEntry } from './schema';

// Data only in P1; the vibes pages ship in P2 (PRD FR-016, FR-060).
const seed: readonly VibeEntry[] = [
  {
    id: 'performance',
    name: { en: 'Performance', th: 'สายสปอร์ต' },
    description: {
      en: 'Light, breathable pieces for training days.',
      th: 'ชิ้นเบา ระบายอากาศดี สำหรับวันออกกำลังกาย',
    },
  },
  {
    id: 'outdoor',
    name: { en: 'Outdoor', th: 'กลางแจ้ง' },
    description: {
      en: 'Layers that handle a long day outside.',
      th: 'เลเยอร์ที่พร้อมสำหรับวันยาว ๆ นอกบ้าน',
    },
  },
  {
    id: 'lazy',
    name: { en: 'Lazy', th: 'วันชิล' },
    description: {
      en: 'Soft, easy pieces for slow days.',
      th: 'ชิ้นนุ่มใส่สบาย สำหรับวันที่อยากอยู่เฉย ๆ',
    },
  },
  {
    id: 'skate',
    name: { en: 'Skate', th: 'สเก็ต' },
    description: {
      en: 'Relaxed fits that take a few knocks.',
      th: 'ทรงหลวม ทนทาน ลุยได้ไม่ต้องห่วง',
    },
  },
  {
    id: 'hockey',
    name: { en: 'Hockey', th: 'ฮอกกี้' },
    description: {
      en: 'Durable layers with a sporty, rink-side feel.',
      th: 'เลเยอร์ทนทาน กลิ่นอายสนามฮอกกี้',
    },
  },
];

export const VIBE_ENTRIES: readonly VibeEntry[] = z.array(vibeEntrySchema).parse(seed);
