// Local, reproducible crops of the Pexels downloads recorded in docs/ASSETS.md.
// Usage: node scripts/prepare-fashion-images.mjs <directory containing ID.jpg originals>
import path from 'node:path';
import sharp from 'sharp';

const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Pass the directory containing the Pexels ID.jpg downloads');

const crops = [
  ['brand/hero-1.webp', 9255738, 1920, 1080, 'north', 0.12],
  ['brand/hero-2.webp', 7318658, 1920, 1080, 'centre'],
  ['brand/hero-3.webp', 10679171, 1920, 1080, 'centre'],
  ['categories/foundations.webp', 3754254, 1200, 800, 'north'],
  ['categories/performance.webp', 7318658, 1200, 800, 'centre'],
  ['categories/lifestyle.webp', 6311503, 1200, 800, 'north'],
  ['categories/accessories.webp', 6786900, 1200, 800, 'north', 0.08],
];

for (const [destination, id, width, height, position, topFraction = 0] of crops) {
  const source = sharp(path.join(sourceDirectory, `${id}.jpg`)).rotate();
  const metadata = await source.metadata();
  const top = Math.round(metadata.height * topFraction);
  const result = await source
    .extract({ left: 0, top, width: metadata.width, height: metadata.height - top })
    .resize(width, height, { fit: 'cover', position })
    .webp({ quality: 76, effort: 6 })
    .toFile(path.join('public/images', destination));
  process.stdout.write(`${destination}: ${result.width}x${result.height}, ${result.size} bytes\n`);
}
