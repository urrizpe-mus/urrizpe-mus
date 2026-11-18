/**
 * Genera favicon e iconos PWA a partir del emblema (src/ui/brand/emblem.ts).
 * Uso: npm run icons
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { emblemSvg } from '../src/ui/brand/emblem';

const out = 'public/icons';
mkdirSync(out, { recursive: true });
const normal = Buffer.from(emblemSvg());
const maskable = Buffer.from(emblemSvg({ padded: true, rounded: false }));
writeFileSync('public/favicon.svg', emblemSvg({ small: true }));
const jobs: [Buffer, number, string][] = [
  [normal, 192, 'icon-192.png'],
  [normal, 512, 'icon-512.png'],
  [maskable, 512, 'maskable-512.png'],
  [maskable, 192, 'maskable-192.png'],
  [Buffer.from(emblemSvg({ rounded: false })), 180, 'apple-touch-icon.png'],
  [Buffer.from(emblemSvg({ small: true })), 32, 'favicon-32.png'],
];
for (const [svg, size, name] of jobs) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(`${out}/${name}`);
}
console.log('Iconos generados en', out);
