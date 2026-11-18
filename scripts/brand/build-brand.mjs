/**
 * Genera toda la identidad visual de URRIZPE MUS a partir de los dibujos
 * propios de scripts/brand (estilo naipe impreso):
 *  - src/ui/brand/generated/logo-full.svg  → los cuatro reyes + cinta «URRIZPE MUS»
 *  - src/ui/brand/generated/fan.svg        → solo el abanico de reyes
 *  - public/favicon.svg y public/icons/*   → favicon (un rey) e iconos de la app
 * Uso: npm run icons
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { commonDefs, C, SERIF, oro, copa } from './lib.mjs';
import { kingCard } from './king.mjs';
const sharp = createRequire(import.meta.url)('sharp');

const KINGS = [
  ['bastos', { robe: 'url(#pGreen)', cape: C.red }],
  ['copas', { robe: 'url(#pRed)', cape: C.blue }],
  ['espadas', { robe: 'url(#pPurple)', cape: C.yellow }],
  ['oros', { robe: 'url(#pBlue)', cape: C.red }],
];
const cards = KINGS.map(([s, o], i) => kingCard(s, o, i < 3));
const fan = (cx, cy, s, spread = 26, step = 80) =>
  cards.map((c, i) => { const k = i - 1.5; const rot = k * (spread * 2 / 3); return `<g transform="translate(${cx + k * step * s} ${cy}) rotate(${rot}) scale(${s}) translate(-60 -150)">${c}</g>`; }).join('');

function banner(cx, cy, w, fs = 42) {
  const h = 52, x = cx - w / 2; const chars = [...'URRIZPE MUS']; const x0 = x + 40, x1 = x + w - 40; const n = chars.length; let letters = '';
  chars.forEach((ch, i) => { if (ch === ' ') return; const t = i / (n - 1); const X = x0 + (x1 - x0) * t; const Y = cy + h / 2 + fs * 0.36 - 10 * Math.sin(Math.PI * t); const ang = -Math.cos(Math.PI * t) * 9;
    letters += `<text x="${X.toFixed(1)}" y="${Y.toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${X.toFixed(1)} ${(Y - fs * 0.36).toFixed(1)})" text-anchor="middle" font-family="${SERIF}" font-weight="900" font-size="${fs}" fill="url(#gGold)" stroke="${C.ink}" stroke-width="1.6" paint-order="stroke">${ch}</text>`; });
  return `<g filter="url(#fShadow)">
  <path d="M${x - 46},${cy + 14} L${x + 10},${cy + 14} L${x + 10},${cy + h + 12} L${x - 46},${cy + h + 12} L${x - 28},${cy + h / 2 + 13}Z" fill="url(#gRibD)" stroke="${C.ink}" stroke-width="1.3"/>
  <path d="M${x + w + 46},${cy + 14} L${x + w - 10},${cy + 14} L${x + w - 10},${cy + h + 12} L${x + w + 46},${cy + h + 12} L${x + w + 28},${cy + h / 2 + 13}Z" fill="url(#gRibD)" stroke="${C.ink}" stroke-width="1.3"/>
  <path d="M${x},${cy} Q${cx},${cy - 20} ${x + w},${cy} L${x + w},${cy + h} Q${cx},${cy + h - 20} ${x},${cy + h}Z" fill="url(#gRib)" stroke="${C.ink}" stroke-width="1.4"/>
  <path d="M${x + 5},${cy + 5} Q${cx},${cy - 14} ${x + w - 5},${cy + 5} M${x + 5},${cy + h - 5} Q${cx},${cy + h - 24} ${x + w - 5},${cy + h - 5}" stroke="url(#gGold)" stroke-width="2.6" fill="none"/>
  </g>${letters}${oro(x - 20, cy + h / 2 + 13, 7)}${copa(x + w + 20, cy + h / 2 + 13, 0.42)}`;
}

const svg = (vb, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="URRIZPE MUS"${extra}><defs>${commonDefs()}</defs>${body}</svg>`;
const felt = (r = 44) => `<rect width="200" height="200" rx="${r}" fill="url(#gFelt)"/>`;
const feltRing = `<rect x="8" y="8" width="184" height="184" rx="37" fill="none" stroke="#c9a227" stroke-opacity=".55" stroke-width="2"/>`;

// Logo completo y abanico (fondo transparente, encuadre ajustado)
const logoFull = svg('22 66 676 446', fan(360, 300, 1.36) + banner(360, 420, 520));
const fanOnly = svg('22 66 676 330', fan(360, 300, 1.36));
// Para la web se exportan en WebP (nítidos en pantallas de alta densidad y ligeros).
await sharp(Buffer.from(logoFull), { density: 220 }).resize(1000).webp({ quality: 86 }).toFile('src/ui/brand/generated/logo-full.webp');
await sharp(Buffer.from(fanOnly), { density: 140 }).resize(460).webp({ quality: 86 }).toFile('src/ui/brand/generated/fan.webp');
await sharp(Buffer.from(fanOnly), { density: 80 }).resize(230).webp({ quality: 80 }).toFile('src/ui/brand/generated/fan-small.webp');

// Iconos de la app: abanico sobre el tapete. Favicon: un solo rey (se distingue en pequeño).
const icon = (padded = false, rounded = true) => {
  const s = padded ? 0.78 : 1; const t = (200 - 200 * s) / 2;
  return svg('0 0 200 200', `${rounded ? felt() + feltRing : felt(0)}<g transform="translate(${t} ${t}) scale(${s})">${fan(100, 130, 0.5, 18, 56)}</g>`);
};
const single = svg('0 0 200 200', `${felt(40)}<g transform="translate(100 104) rotate(-4) scale(0.98) translate(-60 -92)">${kingCard('oros', { robe: 'url(#pBlue)', cape: C.red })}</g>`);
fs.mkdirSync('public/icons', { recursive: true });
fs.writeFileSync('public/favicon.svg', single);
const jobs = [
  [icon(), 192, 'icon-192.png'], [icon(), 512, 'icon-512.png'],
  [icon(true, false), 192, 'maskable-192.png'], [icon(true, false), 512, 'maskable-512.png'],
  [icon(false, false), 180, 'apple-touch-icon.png'], [single, 32, 'favicon-32.png'], [single, 64, 'favicon-64.png'],
];
for (const [s, size, name] of jobs) await sharp(Buffer.from(s), { density: Math.max(96, size * 1.6) }).resize(size, size).png().toFile(`public/icons/${name}`);
// Imagen para compartir (Open Graph)
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs>${commonDefs()}</defs><rect width="1200" height="630" fill="url(#gFelt)"/><g transform="translate(600 330) scale(1.2) translate(-360 -290)">${fan(360, 300, 1.36) + banner(360, 420, 520)}</g></svg>`), { density: 144 }).resize(1200, 630).png().toFile('public/icons/og.png');
console.log('Identidad generada.');
