/**
 * Emblema original de URRIZPE MUS: el as de copas de la baraja española
 * sobre el tapete verde, con la copa como trofeo y el 31 grabado.
 * Dibujo propio (no copia ninguna baraja comercial). Se usa en la interfaz,
 * el favicon, los iconos PWA y los PDF: un solo origen para toda la marca.
 */

export const BRAND = {
  bottle: '#12432f',
  bottleDark: '#0b2c1f',
  gold: '#c9a227',
  goldLight: '#e3c766',
  cream: '#f8f3e6',
  ink: '#25282a',
};

const K = {
  gold: '#d4a62a',
  goldD: '#8a6312',
  goldL: '#fff0a8',
  red: '#b3261e',
  redD: '#6e130e',
  blue: '#1d4f8f',
};
const SERIF = "Fraunces, Georgia, 'DejaVu Serif', 'Times New Roman', serif";

/**
 * SVG del emblema (viewBox 0 0 200 200).
 * @param padded deja margen de seguridad para iconos «maskable».
 * @param background pinta el tapete de fondo.
 * @param rounded esquinas redondeadas del tapete.
 * @param prefix prefijo de ids: cada copia en la misma página necesita el suyo.
 */
export function emblemSvg({
  padded = false,
  background = true,
  rounded = true,
  prefix = 'um',
}: { padded?: boolean; background?: boolean; rounded?: boolean; prefix?: string } = {}): string {
  const p = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
  const ref = (n: string) => `url(#${p}-${n})`;
  const s = padded ? 0.74 : 1;
  const t = (200 - 200 * s) / 2;

  // Pintas de copas: una línea arriba y otra abajo con un corte.
  const pinta = (y: number) => `<line x1="6" y1="${y}" x2="28.4" y2="${y}" stroke="${K.red}" stroke-width="1.3"/><line x1="31.6" y1="${y}" x2="54" y2="${y}" stroke="${K.red}" stroke-width="1.3"/>`;
  const index = `<text x="7.5" y="16" text-anchor="middle" font-family="${SERIF}" font-weight="800" font-size="10" fill="${K.red}">1</text>`;

  const copa = `<g transform="translate(30 46) scale(1.1)" filter="${ref('soft')}">
<path d="M-15,-17 C-15,-2 -9,7 0,8.5 C9,7 15,-2 15,-17Z" fill="${ref('red')}" stroke="${K.redD}" stroke-width=".8"/>
<path d="M-14.4,-10 C-13,-4 -9,1 -5,3" stroke="#ff9a8f" stroke-width="1.4" fill="none" opacity=".7"/>
<path d="M-14.8,-12 H14.8" stroke="${ref('gold')}" stroke-width="2.4"/><circle cx="-7" cy="-12" r="1.1" fill="${K.blue}"/><circle cx="0" cy="-12" r="1.3" fill="#2e9e5b"/><circle cx="7" cy="-12" r="1.1" fill="${K.blue}"/>
<ellipse cx="0" cy="-17" rx="15.2" ry="3.4" fill="${ref('gold')}" stroke="${K.goldD}" stroke-width=".7"/><ellipse cx="0" cy="-17" rx="12.6" ry="2.2" fill="${K.redD}"/>
<rect x="-2.2" y="8" width="4.4" height="9" fill="${ref('gold')}"/><ellipse cx="0" cy="12" rx="4.6" ry="2.6" fill="${ref('gold')}" stroke="${K.goldD}" stroke-width=".5"/><circle cx="0" cy="12" r="1" fill="${K.red}"/>
<path d="M-11,22 Q0,13 11,22Z" fill="${ref('gold')}" stroke="${K.goldD}" stroke-width=".6"/><ellipse cx="0" cy="22.3" rx="11.6" ry="2.5" fill="${ref('gold')}" stroke="${K.goldD}" stroke-width=".6"/></g>`;

  const card = `<g transform="translate(100 100) scale(1.72) translate(-30 -46)">
<g filter="${ref('shadow')}"><rect width="60" height="92" rx="5" fill="${ref('paper')}" stroke="#9b917c" stroke-width=".7"/></g>
<rect x="2.2" y="2.2" width="55.6" height="87.6" rx="3.6" fill="none" stroke="#d8cdb2" stroke-width=".5"/>
${pinta(4.2)}${pinta(87.8)}${index}<g transform="rotate(180 30 46)">${index}</g>${copa}
<text x="30" y="43" text-anchor="middle" font-family="${SERIF}" font-weight="800" font-size="9" fill="${K.goldL}" stroke="${K.redD}" stroke-width=".3">31</text></g>`;

  const bg = background
    ? rounded
      ? `<rect width="200" height="200" rx="44" fill="${ref('bg')}"/><rect x="8" y="8" width="184" height="184" rx="37" fill="none" stroke="${BRAND.gold}" stroke-opacity=".55" stroke-width="2"/>`
      : `<rect width="200" height="200" fill="${ref('bg')}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="URRIZPE MUS">
<defs>
<radialGradient id="${p}-bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#1d6145"/><stop offset=".65" stop-color="${BRAND.bottle}"/><stop offset="1" stop-color="${BRAND.bottleDark}"/></radialGradient>
<linearGradient id="${p}-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${K.goldL}"/><stop offset=".5" stop-color="${K.gold}"/><stop offset="1" stop-color="${K.goldD}"/></linearGradient>
<linearGradient id="${p}-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${K.redD}"/><stop offset=".35" stop-color="#e0473c"/><stop offset=".6" stop-color="${K.red}"/><stop offset="1" stop-color="${K.redD}"/></linearGradient>
<linearGradient id="${p}-paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#efe7d2"/></linearGradient>
<filter id="${p}-shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2"/><feOffset dx="1.2" dy="2.4"/><feComponentTransfer><feFuncA type="linear" slope="0.45"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="${p}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="0.6"/><feOffset dy="0.7"/><feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
${bg}<g transform="translate(${t} ${t}) scale(${s})">${card}</g>
</svg>`;
}
