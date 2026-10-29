import { z } from 'zod';
import { imageAssetSchema, type ImageAsset } from './schema';

// Licensed Pexels photography, cropped to 16:9 (FR-010; sources in docs/ASSETS.md).
// The headline still needs the --color-overlay scrim (DESIGN 5.3).
const seed: readonly ImageAsset[] = [
  {
    src: '/images/brand/hero-1.webp',
    alt: {
      en: 'Two models in cream and white outfits against a soft grey studio backdrop',
      th: 'นายแบบและนางแบบสวมชุดสีครีมและสีขาวในสตูดิโอฉากสีเทาอ่อน',
    },
    width: 1920,
    height: 1080,
  },
  {
    src: '/images/brand/hero-2.webp',
    alt: {
      en: 'A model in a beige sports bra and cycling shorts in a sunlit studio',
      th: 'นางแบบสวมสปอร์ตบรากับกางเกงขาสั้นแนบตัวสีเบจในสตูดิโอที่มีแสงธรรมชาติ',
    },
    width: 1920,
    height: 1080,
  },
  {
    src: '/images/brand/hero-3.webp',
    alt: {
      en: 'Two models wearing sand-coloured suits in a golden field under a cloudy sky',
      th: 'นายแบบและนางแบบสวมสูทสีทรายยืนในทุ่งสีทองใต้ท้องฟ้าที่มีเมฆ',
    },
    width: 1920,
    height: 1080,
  },
];

export const HERO_IMAGES: readonly ImageAsset[] = z.array(imageAssetSchema).parse(seed);
