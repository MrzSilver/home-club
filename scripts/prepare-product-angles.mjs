// Split reviewed ImageGen colour/view atlases into the storefront's back and side photographs.
// Usage: node scripts/prepare-product-angles.mjs <directory containing slug.png atlases>
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PRODUCT_IMAGES } from './placeholder-manifest.mjs';

const directory = process.argv[2];
if (!directory) throw new Error('Pass the directory containing reviewed ImageGen atlases');

// Some generated atlases place the row transition slightly above centre. These boundaries
// were checked against the originals so the next row never leaks into a product photograph.
const ROW_SPLITS = { 'essential-tee': 486, 'everyday-jogger': 474 };

for (const product of PRODUCT_IMAGES) {
  const source = path.join(directory, `${product.slug}.png`);
  const { width, height } = await sharp(source).metadata();
  if (!width || !height) throw new Error(`Missing dimensions: ${source}`);
  const split = ROW_SPLITS[product.slug] ?? Math.round(height / 2);
  const destination = path.join('public/images/products', product.slug);
  await mkdir(destination, { recursive: true });
  for (const [column, color] of product.colors.entries()) {
    const left = Math.round((column * width) / product.colors.length);
    const right = Math.round(((column + 1) * width) / product.colors.length);
    for (const row of [0, 1]) {
      // Trim a few pixels at cell boundaries to remove any generated dividing line.
      const top = row === 0 ? 0 : split;
      const bottom = row === 0 ? split : height;
      const inset = product.slug === 'performance-short' ? 5 : 2;
      const cellWidth = right - left - inset * 2;
      const cellHeight = bottom - top - inset * 2;
      const sockWidth = Math.floor(cellHeight * 0.8);
      const sockCrop = product.slug === 'performance-socks';
      const output = await sharp(source)
        .extract({
          left: left + inset + (sockCrop ? Math.round(cellWidth * 0.34) : 0),
          top: top + inset,
          width: sockCrop ? sockWidth : cellWidth,
          height: cellHeight,
        })
        .resize(1200, 1500, {
          fit: 'cover',
          position: product.garment === 'socks' ? 'east' : 'north',
        })
        .webp({ quality: 82, effort: 5 })
        .toBuffer();
      const target = path.join(destination, `${color}-${row + 2}.webp`);
      await writeFile(`${target}.tmp`, output);
      await rename(`${target}.tmp`, target);
    }
  }
  process.stdout.write(`${product.slug}: back and side angles prepared\n`);
}
