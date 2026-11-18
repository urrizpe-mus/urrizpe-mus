import { jsPDF } from 'jspdf';
import { championOf, matchPairs, matchState } from '../domain/bracket';
import { pairLabel, playersLabel } from '../domain/pairs';
import { pairProgressMap, standings } from '../domain/standings';
import type { Championship, Match, Pair } from '../domain/types';
import { formatDate, roundEliminated, roundName } from '../i18n';
import type { Messages } from '../i18n/es';
import fanUrl from '../ui/brand/generated/fan.webp';

/**
 * Documentos PDF con la identidad de URRIZPE MUS. Se generan en el
 * navegador (jsPDF), sin enviar datos a ningún servidor.
 */

type RGB = [number, number, number];
const C = {
  bottle: [18, 67, 47] as RGB,
  bottleDark: [11, 44, 31] as RGB,
  gold: [201, 162, 39] as RGB,
  goldSoft: [247, 236, 200] as RGB,
  cream: [248, 243, 230] as RGB,
  ink: [37, 40, 42] as RGB,
  muted: [107, 111, 114] as RGB,
  line: [190, 190, 185] as RGB,
  wine: [155, 59, 47] as RGB,
};

/** Las fuentes estándar de PDF solo cubren Latin-1: se sustituye lo demás. */
function latin1(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\u0000-ÿ]/g, '?');
}

async function emblemPng(): Promise<string | null> {
  try {
    if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
    const url = fanUrl;
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('emblema'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 676;
    canvas.height = 330;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 676, 330);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

interface Doc {
  pdf: jsPDF;
  w: number;
  h: number;
  logo: string | null;
}

async function newDoc(orientation: 'portrait' | 'landscape'): Promise<Doc> {
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const logo = await emblemPng();
  return { pdf, w: pdf.internal.pageSize.getWidth(), h: pdf.internal.pageSize.getHeight(), logo };
}

/** Banda superior con marca, campeonato y título del documento. Devuelve la Y donde empieza el contenido. */
function header(d: Doc, ch: Championship, title: string): number {
  const { pdf, w } = d;
  pdf.setFillColor(...C.bottle);
  pdf.rect(0, 0, w, 24, 'F');
  pdf.setFillColor(...C.gold);
  pdf.rect(0, 24, w, 0.8, 'F');
  if (d.logo) pdf.addImage(d.logo, 'PNG', 8, 3.5, 35, 17, 'emblem');
  pdf.setTextColor(...C.cream);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(15);
  pdf.text('URRIZPE', d.logo ? 46 : 10, 12.5, { charSpace: 0.9 });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...C.gold);
  pdf.text('MUS', d.logo ? 46 : 10, 18, { charSpace: 2.4 });
  pdf.setTextColor(...C.cream);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(latin1(ch.name), w - 10, 11.5, { align: 'right', maxWidth: w - 90 });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(latin1(`${title} · ${formatDate(ch.date)}`), w - 10, 17.5, { align: 'right' });
  return 32;
}

function footers(d: Doc) {
  const { pdf, w, h } = d;
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...C.gold);
    pdf.setLineWidth(0.3);
    pdf.line(10, h - 10, w - 10, h - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.muted);
    pdf.text(latin1(`URRIZPE MUS · ${formatDate(new Date().toISOString(), true)}`), 10, h - 6);
    pdf.text(`${i} / ${total}`, w - 10, h - 6, { align: 'right' });
  }
}

function fit(pdf: jsPDF, text: string, maxWidth: number): string {
  let t = latin1(text);
  if (pdf.getTextWidth(t) <= maxWidth) return t;
  while (t.length > 1 && pdf.getTextWidth(`${t}…`.replace('…', '...')) > maxWidth) t = t.slice(0, -1);
  return `${t}...`;
}

/* ------------------------------------------------------------------------- */
/* Cuadro                                                                    */
/* ------------------------------------------------------------------------- */

export async function bracketPdf(ch: Championship, m: Messages): Promise<Blob> {
  const bracket = ch.bracket!;
  const rounds = bracket.rounds;
  const R = rounds.length;
  const pairs = new Map(ch.pairs.map((p) => [p.id, p]));
  const d = await newDoc('landscape');
  const { pdf, w, h } = d;

  // Páginas: bloques de hasta 4 rondas y 8 elementos en la primera columna.
  interface PageSpec {
    r0: number;
    start: number;
    cols: number;
    per: number;
    withChampion: boolean;
  }
  const pages: PageSpec[] = [];
  let r0 = 0;
  for (;;) {
    const n = r0 === 0 ? rounds[0].target : rounds[r0].matches;
    const cols = Math.min(4, R - r0);
    const per = 2 ** (cols - 1);
    const last = r0 + cols - 1 === R - 1;
    for (let s = 0; s < n; s += per) pages.push({ r0, start: s, cols, per, withChampion: last });
    if (last) break;
    r0 += 3;
  }

  const items0 = (r: number, pos: number): { match?: Match; byePairId?: string } => {
    if (r === 0) {
      const mt = bracket.matches.find((x) => x.round === 0 && x.position === pos);
      if (mt) return { match: mt };
      return { byePairId: bracket.byes.find((b) => b.position === pos)?.pairId };
    }
    return { match: bracket.matches.find((x) => x.round === r && x.position === pos) };
  };

  pages.forEach((pg, pi) => {
    if (pi > 0) pdf.addPage();
    const top = header(d, ch, `${m.bracketPage.title} · ${pi + 1}/${pages.length}`);
    const colsTotal = pg.cols + (pg.withChampion ? 1 : 0);
    const gap = 8;
    const cardW = Math.min(62, (w - 20 - gap * (colsTotal - 1)) / colsTotal);
    const areaTop = top + 8;
    const areaH = h - areaTop - 14;
    const slot = areaH / pg.per;
    const cardH = Math.min(17, slot - 2);
    const colX = (c: number) => 10 + c * (cardW + gap);
    const cy = (c: number, j: number) => areaTop + (j + 0.5) * slot * 2 ** c;

    // Cabeceras
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...C.bottle);
    for (let c = 0; c < pg.cols; c++) pdf.text(latin1(roundName(m, rounds[pg.r0 + c], rounds)), colX(c) + cardW / 2, top + 4, { align: 'center' });
    if (pg.withChampion) pdf.text(latin1(m.bracketPage.champion), colX(pg.cols) + cardW / 2, top + 4, { align: 'center' });

    for (let c = 0; c < pg.cols; c++) {
      const r = pg.r0 + c;
      const count = pg.per / 2 ** c;
      const first = pg.start / 2 ** c;
      for (let j = 0; j < count; j++) {
        const pos = first + j;
        const y = cy(c, j);
        const x = colX(c);
        // Conector hacia la siguiente columna
        if (c < pg.cols - 1 || pg.withChampion) {
          const ny = c < pg.cols - 1 ? cy(c + 1, Math.floor(j / 2)) : cy(c, 0);
          const it = items0(r, pos);
          const on = it.byePairId ? true : !!it.match?.winner;
          pdf.setDrawColor(...(on ? C.gold : C.line));
          pdf.setLineWidth(on ? 0.6 : 0.3);
          const xm = x + cardW + gap / 2;
          pdf.line(x + cardW, y, xm, y);
          pdf.line(xm, y, xm, ny);
          pdf.line(xm, ny, x + cardW + gap, ny);
        }
        const it = items0(r, pos);
        if (it.byePairId) drawBye(pdf, pairs.get(it.byePairId)!, x, y, cardW, m);
        else if (it.match) drawMatch(pdf, ch, it.match, pairs, x, y, cardW, cardH, m);
      }
    }
    if (pg.withChampion) {
      const x = colX(pg.cols);
      const y = areaTop + areaH / 2;
      const champ = championOf(bracket);
      const pair = champ ? pairs.get(champ) : undefined;
      pdf.setFillColor(...(pair ? C.bottle : C.cream));
      pdf.setDrawColor(...C.gold);
      pdf.setLineWidth(0.8);
      pdf.roundedRect(x, y - 13, cardW, 26, 2, 2, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...C.gold);
      pdf.text(latin1(m.bracketPage.champion.toUpperCase()), x + cardW / 2, y - 6, { align: 'center', charSpace: 1 });
      pdf.setFontSize(10);
      pdf.setTextColor(...(pair ? C.cream : C.muted));
      pdf.text(pair ? fit(pdf, `${pair.number} · ${pairLabel(pair)}`, cardW - 4) : latin1(m.common.tbd), x + cardW / 2, y + 1, { align: 'center' });
      if (pair?.name) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.text(fit(pdf, playersLabel(pair), cardW - 4), x + cardW / 2, y + 6.5, { align: 'center' });
      }
    }
  });
  footers(d);
  return pdf.output('blob');
}

function drawBye(pdf: jsPDF, pair: Pair, x: number, y: number, wd: number, m: Messages) {
  pdf.setFillColor(...C.goldSoft);
  pdf.setDrawColor(...C.gold);
  pdf.setLineWidth(0.3);
  pdf.setLineDashPattern([1, 0.8], 0);
  pdf.roundedRect(x, y - 4.5, wd, 9, 1.5, 1.5, 'FD');
  pdf.setLineDashPattern([], 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...C.ink);
  pdf.text(String(pair.number), x + 2, y + 1.2);
  pdf.setFont('helvetica', 'normal');
  pdf.text(fit(pdf, pairLabel(pair), wd - 24), x + 8, y + 1.2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6);
  pdf.setTextColor(127, 100, 20);
  pdf.text(latin1(m.status.bye.toUpperCase()), x + wd - 2, y + 1, { align: 'right' });
}

function drawMatch(pdf: jsPDF, ch: Championship, match: Match, pairs: Map<string, Pair>, x: number, y: number, wd: number, hd: number, m: Messages) {
  const bracket = ch.bracket!;
  const [a, b] = matchPairs(bracket, match);
  const state = matchState(bracket, match);
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(...(state === 'ready' ? C.gold : C.line));
  pdf.setLineWidth(state === 'ready' ? 0.5 : 0.3);
  pdf.roundedRect(x, y - hd / 2, wd, hd, 1.5, 1.5, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.8);
  pdf.setTextColor(...C.muted);
  pdf.text(latin1(`${m.common.match.toUpperCase()} ${match.number}`), x + 1.8, y - hd / 2 + 2.9);
  const rowH = (hd - 3.6) / 2;
  const row = (id: string | null, side: 'A' | 'B', i: number) => {
    const ry = y - hd / 2 + 3.6 + rowH * i;
    const win = match.winner === side;
    const lose = !!match.winner && !win;
    if (win) {
      pdf.setFillColor(232, 241, 236);
      pdf.rect(x + 0.4, ry, wd - 0.8, rowH, 'F');
    }
    const srcSide = side === 'A' ? match.sideA : match.sideB;
    const pair = id ? pairs.get(id) : undefined;
    const base = ry + rowH / 2 + 1.1;
    if (!pair) {
      const src = srcSide.from === 'match' ? bracket.matches.find((z) => z.id === srcSide.matchId) : undefined;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(6.5);
      pdf.setTextColor(...C.muted);
      pdf.text(latin1(src ? m.common.winnerOf(src.number) : m.common.tbd), x + 2, base);
      return;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...(lose ? C.muted : win ? C.bottle : C.ink));
    pdf.text(String(pair.number), x + 2, base);
    pdf.setFont('helvetica', win ? 'bold' : 'normal');
    const label = pair.name ? `${pair.name} (${playersLabel(pair)})` : playersLabel(pair);
    pdf.text(fit(pdf, label, wd - 13), x + 8, base);
    if (win) {
      pdf.setTextColor(...C.bottle);
      pdf.setFontSize(6);
      pdf.text('OK', x + wd - 2, base, { align: 'right' });
    }
    if (lose) {
      pdf.setDrawColor(...C.muted);
      pdf.setLineWidth(0.15);
      pdf.line(x + 8, base - 0.9, x + 8 + Math.min(pdf.getTextWidth(fit(pdf, label, wd - 13)), wd - 13), base - 0.9);
    }
  };
  row(a, 'A', 0);
  row(b, 'B', 1);
}

/* ------------------------------------------------------------------------- */
/* Clasificación y parejas                                                   */
/* ------------------------------------------------------------------------- */

function ensureSpace(d: Doc, ch: Championship, title: string, y: number, need: number): number {
  if (y + need <= d.h - 16) return y;
  d.pdf.addPage();
  return header(d, ch, title);
}

export async function standingsPdf(ch: Championship, m: Messages): Promise<Blob> {
  const d = await newDoc('portrait');
  const { pdf, w } = d;
  const title = m.standingsPage.title;
  let y = header(d, ch, title);
  const pairs = new Map(ch.pairs.map((p) => [p.id, p]));
  const groups = standings(ch.bracket!, ch.pairs);
  for (const g of groups) {
    const name =
      g.kind === 'champion' ? m.standingsPage.champion : g.kind === 'alive' ? m.standingsPage.alive : g.kind === 'runnerUp' ? m.standingsPage.runnerUp : roundEliminated(m, g.round!, ch.bracket!.rounds);
    y = ensureSpace(d, ch, title, y, 18);
    pdf.setFillColor(...(g.kind === 'champion' ? C.bottle : C.cream));
    pdf.roundedRect(10, y, w - 20, 9, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(...(g.kind === 'champion' ? C.cream : C.bottle));
    pdf.text(latin1(name), 14, y + 6);
    if (g.kind !== 'alive') {
      pdf.setTextColor(...C.gold);
      pdf.text(latin1(m.standingsPage.position(g.from, g.to)), w - 14, y + 6, { align: 'right' });
    }
    y += 13;
    for (const id of g.pairIds) {
      y = ensureSpace(d, ch, title, y, 7);
      const p = pairs.get(id)!;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...C.ink);
      pdf.text(String(p.number), 16, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(fit(pdf, p.name ? `${p.name} · ${playersLabel(p)}` : playersLabel(p), w - 44), 28, y);
      y += 6.2;
    }
    y += 3;
  }
  footers(d);
  return pdf.output('blob');
}

export async function pairsPdf(ch: Championship, m: Messages): Promise<Blob> {
  const d = await newDoc('portrait');
  const { pdf, w } = d;
  const title = m.pairsPage.title;
  let y = header(d, ch, title);
  const progress = pairProgressMap(ch.drawStatus === 'none' ? null : ch.bracket, ch.pairs);
  const cols = [
    { label: m.pairsPage.number, x: 12, w: 12 },
    { label: m.create.pairName.replace(/ \(.*\)/, ''), x: 26, w: 50 },
    { label: m.create.player1, x: 78, w: 44 },
    { label: m.create.player2, x: 124, w: 44 },
    { label: '', x: 170, w: w - 182 },
  ];
  const head = () => {
    pdf.setFillColor(...C.bottle);
    pdf.rect(10, y, w - 20, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...C.cream);
    cols.forEach((c) => pdf.text(latin1(c.label), c.x, y + 5.4));
    y += 10;
  };
  head();
  ch.pairs
    .slice()
    .sort((a, b) => a.number - b.number)
    .forEach((p, i) => {
      if (y > d.h - 20) {
        pdf.addPage();
        y = header(d, ch, title);
        head();
      }
      if (i % 2 === 0) {
        pdf.setFillColor(...C.cream);
        pdf.rect(10, y - 4.6, w - 20, 7, 'F');
      }
      pdf.setTextColor(...C.ink);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(String(p.number), cols[0].x, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(fit(pdf, p.name || '-', cols[1].w - 2), cols[1].x, y);
      pdf.text(fit(pdf, p.player1, cols[2].w - 2), cols[2].x, y);
      pdf.text(fit(pdf, p.player2, cols[3].w - 2), cols[3].x, y);
      pdf.setFontSize(7.5);
      pdf.setTextColor(...C.muted);
      pdf.text(latin1(m.status[progress.get(p.id)?.status ?? 'registered']), cols[4].x, y);
      y += 7;
    });
  footers(d);
  return pdf.output('blob');
}

/* ------------------------------------------------------------------------- */
/* CSV                                                                       */
/* ------------------------------------------------------------------------- */

/** CSV con «;» (Excel en español) y protección frente a fórmulas. */
export function pairsCsv(ch: Championship, m: Messages): string {
  const progress = pairProgressMap(ch.drawStatus === 'none' ? null : ch.bracket, ch.pairs);
  const cell = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = [['Número', 'Nombre de pareja', 'Integrante 1', 'Integrante 2', 'Estado']];
  ch.pairs
    .slice()
    .sort((a, b) => a.number - b.number)
    .forEach((p) => rows.push([String(p.number), p.name, p.player1, p.player2, m.status[progress.get(p.id)?.status ?? 'registered']]));
  return `﻿${rows.map((r) => r.map(cell).join(';')).join('\r\n')}`;
}
