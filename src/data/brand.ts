import { z } from 'zod';
import { imageAssetSchema, type ImageAsset } from './schema';

// Hero carousel slides (FR-010). Generated placeholders, 16:9, with a darker bottom-left area for the
// headline; the hero still needs the --color-overlay scrim (DESIGN 5.3).
const seed: readonly ImageAsset[] = [
  {
    src: '/images/brand/hero-1.webp',
    alt: {
      en: 'Warm sand walls and a standing figure in soft morning light',
      th: 'ผนังโทนทรายอบอุ่นและเงาคนยืนในแสงยามเช้า',
    },
    width: 1920,
    height: 1080,
  },
  {
    src: '/images/brand/hero-2.webp',
    alt: {
      en: 'A figure in sand tones walking between dark forest trunks',
      th: 'เงาคนในโทนสีทรายเดินผ่านลำต้นไม้ในป่าเข้ม',
    },
    width: 1920,
    height: 1080,
  },
  {
    src: '/images/brand/hero-3.webp',
    alt: {
      en: 'A seated figure on pale concrete steps',
      th: 'เงาคนนั่งบนบันไดคอนกรีตสีอ่อน',
    },
    width: 1920,
    height: 1080,
  },
];

export const HERO_IMAGES: readonly ImageAsset[] = z.array(imageAssetSchema).parse(seed);
