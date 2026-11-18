// Librería de dibujo «estilo naipe impreso»: contorno de tinta, rayados y estampados.
export const SERIF = "Fraunces, Georgia, 'DejaVu Serif', serif";
export const C = { ink:'#1c1a17', red:'#c8231e', redD:'#7a1410', blue:'#2a5aa8', blueD:'#173a75', yellow:'#f2c230', yellowD:'#b9860f', green:'#2f8a3a', greenD:'#1a5424', purple:'#6b3389', skin:'#f5cda6', skinD:'#d7a07a', white:'#fbf8f1', grey:'#c9c4ba', steel:'#dfe6ec', wood:'#a8692e', woodD:'#6a3e17' };
let n=0; export const uid=(p='i')=>`${p}${++n}`;
export const O = `stroke="${C.ink}" stroke-width="1" stroke-linejoin="round"`;
const o = (w=1)=>`stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const ink = o;

/** Rayado (sombreado de grabado) recortado dentro de una forma. */
export function hatch(shape, { angle=60, gap=1.8, w=0.45, color=C.ink, opacity=0.55, box=[0,0,240,380] }={}) {
  const id=uid('h'); const [x0,y0,x1,y1]=box; let lines='';
  const L=Math.hypot(x1-x0,y1-y0); const cx=(x0+x1)/2, cy=(y0+y1)/2;
  for(let d=-L; d<=L; d+=gap){ lines+=`M${cx-L} ${cy+d}H${cx+L}`; }
  return `<clipPath id="${id}">${shape}</clipPath><g clip-path="url(#${id})"><path d="${lines}" transform="rotate(${angle} ${cx} ${cy})" stroke="${color}" stroke-width="${w}" opacity="${opacity}" fill="none"/></g>`;
}

export function commonDefs() { return `
<pattern id="pRed" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${C.red}"/><circle cx="3" cy="3" r=".9" fill="${C.yellow}"/></pattern>
<pattern id="pBlue" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="${C.blue}"/><path d="M3.5,1.5 l1.2,2 l-1.2,2 l-1.2,-2Z" fill="${C.yellow}" opacity=".9"/></pattern>
<pattern id="pGreen" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="${C.green}"/><circle cx="3.5" cy="3.5" r="1.1" fill="none" stroke="${C.yellow}" stroke-width=".6"/></pattern>
<pattern id="pPurple" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="${C.purple}"/><path d="M3.5,2 v3 M2,3.5 h3" stroke="${C.yellow}" stroke-width=".6"/></pattern>
<pattern id="pBand" width="5" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="10" fill="${C.yellow}"/><circle cx="2.5" cy="5" r="1.2" fill="${C.red}" stroke="${C.ink}" stroke-width=".3"/></pattern>
<pattern id="pErmine" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${C.white}"/><path d="M4,2.2 l.9,2.6 l-.9,1 l-.9,-1Z" fill="${C.ink}"/></pattern>
<linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".5" stop-color="#e2b232"/><stop offset="1" stop-color="#946a10"/></linearGradient>
<linearGradient id="gPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf7"/><stop offset="1" stop-color="#efe7d3"/></linearGradient>
<linearGradient id="gSteel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8ea2b3"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#8ea2b3"/></linearGradient>
<linearGradient id="gRib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2463a"/><stop offset=".5" stop-color="#b3241b"/><stop offset="1" stop-color="#6a110c"/></linearGradient>
<linearGradient id="gRibD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d1a12"/><stop offset="1" stop-color="#4a0b07"/></linearGradient>
<radialGradient id="gFelt" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="#1d6145"/><stop offset=".65" stop-color="#12432f"/><stop offset="1" stop-color="#0b2c1f"/></radialGradient>
<radialGradient id="gCoin" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="${C.yellow}"/><stop offset="1" stop-color="${C.yellowD}"/></radialGradient>
<filter id="fShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="3.5"/><feOffset dx="2.5" dy="5"/><feComponentTransfer><feFuncA type="linear" slope=".42"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="fGrain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .42 0 0 0 0 .28 0 0 0 .13 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`; }

/* ------------------------- palos (estilo grabado) ------------------------- */
export function oro(x,y,r){ let rays='',dots='';
  for(let i=0;i<16;i++){const a=Math.PI*i/8,b=a+Math.PI/16,c=a-Math.PI/16;const p=(R,t)=>`${(x+R*Math.cos(t)).toFixed(2)},${(y+R*Math.sin(t)).toFixed(2)}`;rays+=`<path d="M${p(r*.36,c)}L${p(r*.72,a)}L${p(r*.36,b)}Z" fill="${i%2?C.red:C.yellowD}" ${o(.35)}/>`;}
  for(let i=0;i<24;i++){const a=2*Math.PI*i/24;dots+=`<circle cx="${(x+r*.88*Math.cos(a)).toFixed(2)}" cy="${(y+r*.88*Math.sin(a)).toFixed(2)}" r="${r*.045}" fill="${C.ink}"/>`;}
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gCoin)" ${o(1)}/>${dots}<circle cx="${x}" cy="${y}" r="${r*.78}" fill="url(#gCoin)" ${o(.7)}/><circle cx="${x}" cy="${y}" r="${r*.74}" fill="none" stroke="${C.blue}" stroke-width="${r*.05}"/>${rays}<circle cx="${x}" cy="${y}" r="${r*.34}" fill="url(#gCoin)" ${o(.6)}/><circle cx="${x}" cy="${y}" r="${r*.12}" fill="${C.red}" ${o(.4)}/>${hatch(`<circle cx="${x+r*.15}" cy="${y+r*.15}" r="${r}"/>`,{angle:-40,gap:r*.09,w:r*.02,opacity:.25,box:[x-r,y-r,x+r,y+r]})}`; }
export function copa(x,y,s){ const sh=`<path d="M-15,-17 C-15,-2 -9,7 0,8.5 C9,7 15,-2 15,-17Z"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-15,-17 C-15,-2 -9,7 0,8.5 C9,7 15,-2 15,-17Z" fill="${C.red}" ${o(.9)}/>${hatch(`<path d="M2,-17 C10,-2 8,6 0,8.5 C9,7 15,-2 15,-17Z"/>`,{angle:70,gap:1.3,w:.4,opacity:.6,box:[-16,-18,16,10]})}
  <path d="M-11,-8 C-10,-2 -6,2 -3,3.5" stroke="#ff9d92" stroke-width="1.6" fill="none"/>
  <path d="M-14.7,-12.5 H14.7 L14.3,-10.5 H-14.3Z" fill="${C.yellow}" ${o(.5)}/><circle cx="-7" cy="-11.5" r="1.2" fill="${C.blue}" ${o(.3)}/><circle cx="0" cy="-11.5" r="1.4" fill="${C.green}" ${o(.3)}/><circle cx="7" cy="-11.5" r="1.2" fill="${C.blue}" ${o(.3)}/>
  <ellipse cx="0" cy="-17" rx="15.3" ry="3.5" fill="${C.yellow}" ${o(.8)}/><ellipse cx="0" cy="-17" rx="12.3" ry="2.1" fill="${C.redD}" ${o(.4)}/>
  <path d="M-2.4,8 H2.4 V17 H-2.4Z" fill="${C.yellow}" ${o(.6)}/><ellipse cx="0" cy="12" rx="5" ry="2.8" fill="${C.yellow}" ${o(.6)}/><circle cx="0" cy="12" r="1.1" fill="${C.red}"/>
  <path d="M-11.5,22 Q0,13 11.5,22Z" fill="${C.yellow}" ${o(.7)}/><ellipse cx="0" cy="22.3" rx="12" ry="2.7" fill="${C.yellow}" ${o(.7)}/>${hatch(`<path d="M0,13 Q11.5,13 11.5,22 L12,22.5 L0,25Z"/>`,{angle:60,gap:1.2,w:.35,opacity:.5,box:[-12,12,13,26]})}</g>`; }
export function espada(x,y,s,rot=0){ return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M0,-34 L2.8,-28 L2.6,8 L-2.6,8 L-2.8,-28Z" fill="url(#gSteel)" ${o(.7)}/><path d="M0,-29 V6" stroke="${C.ink}" stroke-width=".5"/>
  <path d="M-11,8.5 C-13,6 -15,7.5 -14,10 C-12,12.5 -6,11.5 0,11.5 C6,11.5 12,12.5 14,10 C15,7.5 13,6 11,8.5Z" fill="${C.yellow}" ${o(.6)}/>
  <path d="M-2.2,11.5 H2.2 V21 H-2.2Z" fill="${C.blue}" ${o(.5)}/><path d="M-2.2,13.5 L2.2,15 M-2.2,16.5 L2.2,18 M-2.2,19.5 L2.2,21" stroke="${C.yellow}" stroke-width=".6"/>
  <circle cx="0" cy="23.4" r="2.8" fill="${C.yellow}" ${o(.5)}/><circle cx="0" cy="23.4" r="1" fill="${C.red}"/></g>`; }
export function basto(x,y,s,rot=0){ return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M-3.4,30 Q-4.4,6 -8.4,-18 Q-9,-31 0,-32.5 Q9,-31 8.4,-18 Q4.4,6 3.4,30 Q0,32 -3.4,30Z" fill="${C.wood}" ${o(.8)}/>
  ${hatch(`<path d="M2,-32 Q9,-31 8.4,-18 Q4.4,6 3.4,30 L1,30 Q2,6 4,-18Z"/>`,{angle:80,gap:1.2,w:.4,opacity:.6,box:[-10,-34,10,32]})}
  <path d="M-3,-27 Q0,-10 -.8,24" stroke="#e2b07a" stroke-width="1.3" fill="none"/>
  <g fill="${C.woodD}" ${o(.4)}><ellipse cx="-6.8" cy="-15" rx="2.4" ry="1.7"/><ellipse cx="6.2" cy="-7" rx="2.2" ry="1.6"/><ellipse cx="-5.2" cy="3" rx="2" ry="1.5"/><ellipse cx="4.6" cy="12" rx="1.7" ry="1.3"/></g>
  <path d="M-7,-15 q-7,-3 -9,-9 q6,1 9,9Z M6.2,-7 q7,-2 9,-8 q-6,0 -9,8Z" fill="${C.green}" ${o(.4)}/><path d="M-3.6,27 H3.6 V30 H-3.6Z" fill="${C.yellow}" ${o(.4)}/></g>`; }
