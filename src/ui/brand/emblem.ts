/**
 * Emblema original de URRIZPE MUS: dos naipes abiertos en abanico sobre un
 * tapete verde botella, con una moneda dorada de rayos en el naipe delantero.
 * Se usa en la interfaz, el favicon, los iconos PWA y los PDF.
 * Un solo origen para que la marca sea idéntica en todas partes.
 */

export const BRAND = {
  bottle: '#12432f',
  bottleDark: '#0b2c1f',
  gold: '#c9a227',
  goldLight: '#e3c766',
  cream: '#f8f3e6',
  ink: '#25282a',
};

/** Rayos de la moneda (estrella de 8 puntas). */
function sunPath(cx: number, cy: number, outer: number, inner: number, points = 8): string {
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    parts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${parts.join('L')}Z`;
}

/**
 * SVG del emblema (viewBox 0 0 64 64).
 * @param padded deja margen de seguridad para iconos «maskable».
 * @param background pinta el fondo del icono.
 */
export function emblemSvg({ padded = false, background = true, rounded = true }: { padded?: boolean; background?: boolean; rounded?: boolean } = {}): string {
  const { bottle, bottleDark, gold, goldLight, cream } = BRAND;
  const s = padded ? 0.78 : 1;
  const t = (64 - 64 * s) / 2;
  const bg = background
    ? rounded
      ? `<rect x="0" y="0" width="64" height="64" rx="14" fill="url(#um-bg)"/><rect x="3" y="3" width="58" height="58" rx="11.5" fill="none" stroke="${gold}" stroke-opacity="0.55" stroke-width="0.9"/>`
      : `<rect x="0" y="0" width="64" height="64" fill="url(#um-bg)"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="URRIZPE MUS">
<defs>
<radialGradient id="um-bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#1b5a40"/><stop offset="0.7" stop-color="${bottle}"/><stop offset="1" stop-color="${bottleDark}"/></radialGradient>
<linearGradient id="um-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${goldLight}"/><stop offset="1" stop-color="${gold}"/></linearGradient>
</defs>
${bg}
<g transform="translate(${t} ${t}) scale(${s})">
<g transform="rotate(-14 30 36)"><rect x="15.5" y="15" width="23" height="33" rx="3.2" fill="${cream}" stroke="url(#um-gold)" stroke-width="1.4"/><rect x="18.3" y="17.8" width="17.4" height="27.4" rx="1.6" fill="none" stroke="${gold}" stroke-opacity="0.45" stroke-width="0.7"/></g>
<g transform="rotate(10 36 36)"><rect x="25" y="15.5" width="23" height="33" rx="3.2" fill="${cream}" stroke="url(#um-gold)" stroke-width="1.4"/><rect x="27.8" y="18.3" width="17.4" height="27.4" rx="1.6" fill="none" stroke="${gold}" stroke-opacity="0.45" stroke-width="0.7"/>
<circle cx="36.5" cy="32" r="7.4" fill="url(#um-gold)"/><circle cx="36.5" cy="32" r="5.6" fill="none" stroke="${bottle}" stroke-width="0.8"/><path d="${sunPath(36.5, 32, 4.4, 1.9)}" fill="${bottle}"/><circle cx="36.5" cy="32" r="1.1" fill="${goldLight}"/></g>
</g>
</svg>`;
}
