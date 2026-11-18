import { C, ink, hatch, oro, copa, espada, basto, uid, SERIF } from './lib.mjs';
const o = ink;

/**
 * Rey de la baraja (dibujo propio, estilo naipe impreso) en una carta de 120 × 184.
 * robe/cape: rellenos (patrones o colores); item: palo que sostiene en la mano derecha.
 */
export function kingFigure({ robe='url(#pRed)', cape=C.blue, item='copas', lining='url(#pErmine)' }) {
  const robeP = `<path d="M47,68 C42,92 38,130 33,166 L89,166 C84,130 80,92 75,68Z"/>`;
  const capeL = `<path d="M47,64 C34,80 27,122 22,164 L38,167 C40,128 43,98 53,80Z"/>`;
  const capeR = `<path d="M75,64 C90,80 96,122 100,164 L86,167 C83,128 80,98 69,80Z"/>`;
  let held='';
  if(item==='copas') held=copa(92,86,0.78);
  if(item==='oros') held=oro(93,92,10);
  if(item==='espadas') held=espada(92,118,0.95,8);
  if(item==='bastos') held=basto(94,92,1.0,28);
  // Barba con mechones
  let strands='';for(let i=0;i<7;i++){const x=54+i*2.4;strands+=`M${x},${52+i%2} q${(i-3)*.6},8 ${(i-3)*.9},${15-Math.abs(i-3)*1.6}`;}
  return `
  <!-- sombra en el suelo -->
  <ellipse cx="61" cy="170" rx="34" ry="3.2" fill="${C.ink}" opacity=".18"/>
  <!-- manto -->
  ${capeL.replace('/>',` fill="${cape}" ${o(1)}/>`)}${capeR.replace('/>',` fill="${cape}" ${o(1)}/>`)}
  ${hatch(capeR,{angle:75,gap:1.6,w:.45,opacity:.5,box:[60,60,104,170]})}${hatch(capeL,{angle:105,gap:2.2,w:.4,opacity:.3,box:[20,60,56,170]})}
  <path d="M51,80 C42,100 40,130 38,166" stroke="url(#pErmine)" stroke-width="5" fill="none"/><path d="M71,80 C80,100 82,130 86,166" stroke="url(#pErmine)" stroke-width="5" fill="none"/>
  <path d="M51,80 C42,100 40,130 38,166 M71,80 C80,100 82,130 86,166" stroke="${C.ink}" stroke-width=".6" fill="none" transform="translate(-2.5 0)"/>
  <path d="M30,110 Q33,140 28,162 M93,110 Q90,140 95,162" stroke="${C.ink}" stroke-width=".7" fill="none"/>
  <!-- túnica -->
  ${robeP.replace('/>',` fill="${robe}" ${o(1)}/>`)}
  ${hatch(robeP,{angle:80,gap:1.5,w:.45,opacity:.45,box:[64,66,92,168]})}
  <path d="M57,72 L56,158 L66,158 L65,72Z" fill="url(#pBand)" ${o(.7)}/>
  <path d="M35,154 C50,158 72,158 87,154 L89,166 L33,166Z" fill="url(#pBand)" ${o(.8)}/>
  <path d="M44,120 Q46,140 42,154 M78,120 Q76,140 80,154 M50,100 Q49,130 47,154" stroke="${C.ink}" stroke-width=".6" fill="none"/>
  <!-- zapatos -->
  <path d="M42,166 Q38,172 46,173 L56,172 L55,166Z" fill="${C.yellow}" ${o(.8)}/><path d="M68,166 L67,172 L78,173 Q85,172 80,166Z" fill="${C.yellow}" ${o(.8)}/>
  <!-- cinturón -->
  <path d="M46,102 Q61,107 76,102 L77,108 Q61,113 45,108Z" fill="${C.ink}"/><rect x="57.5" y="102.8" width="8" height="7" rx="1" fill="${C.yellow}" ${o(.5)}/><circle cx="61.5" cy="106.3" r="1.3" fill="${C.red}"/>
  <!-- brazo izquierdo sobre el pecho -->
  <path d="M50,70 C42,84 44,100 55,108 L62,103 C55,96 53,86 56,78Z" fill="${robe}" ${o(.9)}/>${hatch(`<path d="M50,70 C42,84 44,100 55,108 L58,106 C50,98 48,86 52,74Z"/>`,{angle:60,gap:1.5,w:.4,opacity:.45,box:[40,66,64,110]})}
  <path d="M53,104 L60,100 L63,104 L56,109Z" fill="${C.yellow}" ${o(.6)}/>
  <path d="M60,103 C63,101 67,102 67,105 C67,108 63,109 60,108Z" fill="${C.skin}" ${o(.6)}/><path d="M63,103 v4 M65,103.2 v3.6" stroke="${C.ink}" stroke-width=".4"/>
  <!-- brazo derecho que sostiene el palo -->
  <path d="M72,68 C84,76 90,90 92,100 L84,105 C81,94 77,86 68,80Z" fill="${robe}" ${o(.9)}/>${hatch(`<path d="M72,68 C84,76 90,90 92,100 L88,102 C85,92 80,82 72,76Z"/>`,{angle:60,gap:1.5,w:.4,opacity:.5,box:[66,66,94,106]})}
  <path d="M83,98 L91,94 L94,100 L86,104Z" fill="${C.yellow}" ${o(.6)}/>
  ${held}
  <path d="M88,100 C91,97 96,98 96,102 C96,106 91,107 88,105Z" fill="${C.skin}" ${o(.6)}/><path d="M91,99 v5 M93.4,99.2 v4.6" stroke="${C.ink}" stroke-width=".4"/>
  <!-- cuello de armiño -->
  <path d="M43,63 Q61,75 80,63 L83,71 Q61,84 40,71Z" fill="url(#pErmine)" ${o(.8)}/>
  <!-- pelo y cabeza -->
  <path d="M50,36 C47,46 48,56 52,62 L56,56 Z M72,36 C75,46 74,56 70,62 L66,56Z" fill="${C.white}" ${o(.6)}/>
  <path d="M51,36 C50,50 54,57 61,58 C68,57 72,50 71,36 C71,30 51,30 51,36Z" fill="${C.skin}" ${o(.9)}/>
  ${hatch(`<path d="M64,34 C71,34 71,50 66,56 L62,58 C68,50 69,40 64,34Z"/>`,{angle:30,gap:1.1,w:.35,opacity:.45,box:[60,32,72,60]})}
  <!-- cejas, ojos, nariz -->
  <path d="M54.2,40.6 q3,-2.4 5.6,-.4 M62.8,40.2 q2.8,-2 5.4,.4" stroke="${C.grey}" stroke-width="1.6" fill="none"/><path d="M54.2,40.6 q3,-2.4 5.6,-.4 M62.8,40.2 q2.8,-2 5.4,.4" stroke="${C.ink}" stroke-width=".45" fill="none"/>
  <path d="M55,43.4 q2.3,-1.6 4.4,0 q-2.2,1.4 -4.4,0Z M63.2,43.2 q2.2,-1.6 4.3,0 q-2.1,1.4 -4.3,0Z" fill="#fff" ${o(.45)}/><circle cx="57.4" cy="43.3" r=".85" fill="${C.ink}"/><circle cx="65.5" cy="43.1" r=".85" fill="${C.ink}"/>
  <path d="M61.3,42.5 C60.6,46 59.6,48.4 61,49 C62,49.4 63,48.6 63,48" stroke="${C.ink}" stroke-width=".6" fill="none"/>
  <ellipse cx="56" cy="48" rx="2" ry="1.1" fill="#e9907c" opacity=".55"/><ellipse cx="66.5" cy="48" rx="2" ry="1.1" fill="#e9907c" opacity=".55"/>
  <!-- barba y bigote -->
  <path d="M51.5,47 C51,58 55,70 61,76 C67,70 71,58 70.5,47 C68,52 64,53 61,52.5 C58,53 54,52 51.5,47Z" fill="${C.white}" ${o(.9)}/>
  <path d="${strands}" stroke="${C.grey}" stroke-width=".7" fill="none"/>
  <path d="M54,51.5 C56,49.5 59,49.5 61,51 C63,49.5 66,49.5 68,51.5 C66,53.6 63,53.4 61,52.4 C59,53.4 56,53.6 54,51.5Z" fill="${C.white}" ${o(.6)}/>
  <!-- corona -->
  <path d="M50,32 L48,17 L54,25 L57.5,14 L61,24 L64.5,14 L68,25 L74,17 L72,32Z" fill="${C.red}" ${o(.8)}/>
  <path d="M50,32 L48,17 L54,25 L57.5,14 L61,24 L64.5,14 L68,25 L74,17 L72,32" fill="none" stroke="${C.yellow}" stroke-width="2.2"/><path d="M50,32 L48,17 L54,25 L57.5,14 L61,24 L64.5,14 L68,25 L74,17 L72,32" fill="none" stroke="${C.ink}" stroke-width=".5"/>
  <g fill="${C.yellow}" ${o(.5)}><circle cx="48" cy="16" r="1.5"/><circle cx="57.5" cy="13" r="1.6"/><circle cx="64.5" cy="13" r="1.6"/><circle cx="74" cy="16" r="1.5"/></g>
  <path d="M49,29 Q61,27 73,29 L73.4,35 Q61,33 48.6,35Z" fill="${C.yellow}" ${o(.8)}/><circle cx="54" cy="31.6" r="1.3" fill="${C.red}" ${o(.3)}/><circle cx="61" cy="31.2" r="1.6" fill="${C.blue}" ${o(.3)}/><circle cx="68" cy="31.6" r="1.3" fill="${C.red}" ${o(.3)}/>`;
}

const SUITC={oros:C.yellowD,copas:C.red,espadas:C.blue,bastos:C.green}; const BRK={oros:0,copas:1,espadas:2,bastos:3};
export function pintas(suit){const c=SUITC[suit],k=BRK[suit];let out='';for(const y of [7,177]){const x0=11,x1=109,g=5;if(!k){out+=`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${c}" stroke-width="2.4"/>`;continue}const s=(x1-x0-g*k)/(k+1);for(let i=0;i<=k;i++){const a=x0+i*(s+g);out+=`<line x1="${a}" y1="${y}" x2="${a+s}" y2="${y}" stroke="${c}" stroke-width="2.4"/>`}}return out;}
export function cardBase(suit,label){ return `<g filter="url(#fShadow)"><rect width="120" height="184" rx="8" fill="url(#gPaper)" stroke="#8e846f" stroke-width="1"/></g><rect width="120" height="184" rx="8" fill="#fff" filter="url(#fGrain)" opacity=".6"/>
  ${pintas(suit)}<text x="16" y="27" text-anchor="middle" font-family="${SERIF}" font-weight="800" font-size="15" fill="${C.ink}">${label}</text><g transform="rotate(180 60 92)"><text x="16" y="27" text-anchor="middle" font-family="${SERIF}" font-weight="800" font-size="15" fill="${C.ink}">${label}</text></g>`; }
export function kingCard(suit, opts, mirror=false){ const mini = suit==='oros'?oro(100,24,7.5):suit==='copas'?copa(100,25,.5):suit==='espadas'?espada(100,26,.42):basto(100,26,.42);
  return `${cardBase(suit,'12')}${mini}<g transform="translate(60 98) scale(${mirror?-1.08:1.08} 1.08) translate(-61 -96)">${kingFigure({...opts,item:suit})}</g>`; }
export function aceCard(suit){ const big = suit==='oros'?oro(60,92,34):suit==='copas'?copa(60,90,1.9):suit==='espadas'?espada(60,92,1.85,0):basto(60,92,1.75,0);
  return `${cardBase(suit,'1')}${big}`; }
