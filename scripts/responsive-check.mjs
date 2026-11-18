/**
 * Comprobación visual y responsive con un navegador real (Chrome/Chromium local).
 * Uso:  npm run build && npm run check:responsive
 * Variables: CHROME_PATH (ruta de Chrome), BASE_URL (por defecto, vista previa local).
 * Genera capturas en ./screenshots y falla si algo se sale de la pantalla.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const BASE = process.env.BASE_URL || 'http://localhost:4173/urrizpe-mus';
const PAIRS = Number(process.env.PAIRS || 23);
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

let server;
if (!process.env.BASE_URL) {
  server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
}

const viewports = {
  movil: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { width: 820, height: 1180, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  ordenador: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const problems = [];

async function overflow(page, label) {
  const o = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const bad = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // Ignora contenedores con desplazamiento horizontal intencionado.
      let p = el.parentElement;
      while (p) {
        const s = getComputedStyle(p);
        if (s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowX === 'hidden') return;
        p = p.parentElement;
      }
      if (r.right > w + 1 || r.left < -1) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
    });
    return { scroll: document.documentElement.scrollWidth > w + 1, bad: bad.slice(0, 5) };
  });
  if (o.scroll || o.bad.length) problems.push(`${label}: contenido fuera de pantalla ${JSON.stringify(o)}`);
}

// Crear un campeonato real desde la interfaz (en ordenador) y jugar algunos partidos.
const ctx = await browser.newContext({ viewport: viewports.ordenador });
const page = await ctx.newPage();
page.on('pageerror', (e) => problems.push(`Error JS: ${e.message}`));
await page.goto(`${BASE}/nuevo`);
await page.getByLabel('Nombre', { exact: true }).fill('Campeonato de mus de fiestas');
await page.getByRole('button', { name: 'Pegar lista' }).click();
const names = ['Lloyd y HB', 'Aratz y Egoitz', ...Array.from({ length: PAIRS - 2 }, (_, i) => `Jugador ${2 * i + 5} y Jugador ${2 * i + 6}`)];
await page.getByRole('textbox', { name: 'Pegar lista de parejas' }).fill(names.join('\n'));
await page.getByRole('button', { name: /Añadir \d+ parejas/ }).click();
await page.getByRole('button', { name: 'Crear campeonato', exact: true }).click();
await page.waitForURL(/\/c\//);
const champUrl = page.url();
await page.goto(`${champUrl}/sorteo`);
await page.getByRole('button', { name: 'Realizar sorteo' }).click();
await page.getByRole('button', { name: 'Confirmar cuadro' }).first().click();
await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cuadro' }).click();
await page.waitForTimeout(400);
await page.goto(`${champUrl}/partidos`);
for (let i = 0; i < Math.min(9, PAIRS - 1); i++) {
  await page.getByRole('button', { name: /Seleccionar como ganadora/i }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar' }).click();
  await page.waitForTimeout(150);
}
const state = await ctx.storageState({ indexedDB: true });
await ctx.close();

const routes = [
  ['inicio', '/'],
  ['panel', champUrl.replace(BASE, '')],
  ['parejas', `${champUrl.replace(BASE, '')}/parejas`],
  ['sorteo', `${champUrl.replace(BASE, '')}/sorteo`],
  ['cuadro', `${champUrl.replace(BASE, '')}/cuadro`],
  ['partidos', `${champUrl.replace(BASE, '')}/partidos`],
  ['clasificacion', `${champUrl.replace(BASE, '')}/clasificacion`],
  ['exportar', `${champUrl.replace(BASE, '')}/exportar`],
  ['vista', `${champUrl.replace(BASE, '')}/vista`],
  ['nuevo', '/nuevo'],
  ['ajustes', '/ajustes'],
];

for (const [device, vp] of Object.entries(viewports)) {
  const c = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor, storageState: state });
  const p = await c.newPage();
  p.on('pageerror', (e) => problems.push(`${device} error JS: ${e.message}`));
  for (const [name, path] of routes) {
    await p.goto(`${BASE}${path}`);
    await p.waitForTimeout(500);
    await overflow(p, `${device}/${name}`);
    await p.screenshot({ path: `${OUT}/${device}-${name}.png`, fullPage: name !== 'cuadro' && name !== 'vista' });
  }
  // Tamaño mínimo de los botones principales en móvil (≥ 40 px de alto).
  if (vp.isMobile) {
    await p.goto(`${champUrl}/partidos`);
    const sizes = await p.getByRole('button', { name: /Seleccionar como ganadora/i }).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    if (sizes.some((h) => h < 40)) problems.push(`${device}: botones de ganadora demasiado pequeños`);
  }
  await c.close();
}

await browser.close();
server?.kill();
if (problems.length) {
  console.error('PROBLEMAS:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`OK: ${routes.length} pantallas × ${Object.keys(viewports).length} tamaños sin errores ni desbordes. Capturas en ./${OUT}`);
