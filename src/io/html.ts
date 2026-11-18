import { championOf, matchPairs } from '../domain/bracket';
import { playersLabel } from '../domain/pairs';
import { standings } from '../domain/standings';
import type { Championship, Pair } from '../domain/types';
import { formatDate, roundEliminated, roundName } from '../i18n';
import type { Messages } from '../i18n/es';
import fanSmall from '../ui/brand/generated/fan-small.webp?inline';

/** Escapa texto para HTML: los nombres nunca se interpretan como código. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Página HTML autónoma de solo consulta: se puede enviar por WhatsApp o
 * correo y abrir en cualquier navegador, sin conexión y sin poder modificar nada.
 * No contiene JavaScript.
 */
export function readOnlyHtml(ch: Championship, m: Messages): string {
  const pairs = new Map(ch.pairs.map((p) => [p.id, p]));
  const pairHtml = (p: Pair | undefined, cls = '') =>
    p
      ? `<span class="p ${cls}"><b>${p.number}</b><span><strong>${esc(p.name || playersLabel(p))}</strong>${p.name ? `<small>${esc(playersLabel(p))}</small>` : ''}</span></span>`
      : `<span class="p tbd">${esc(m.common.tbd)}</span>`;

  let body = '';
  const b = ch.drawStatus === 'confirmed' ? ch.bracket : null;
  if (b) {
    const champ = championOf(b);
    if (champ) body += `<section class="champ"><p>${esc(m.standingsPage.champion)}</p>${pairHtml(pairs.get(champ))}</section>`;
    body += `<h2>${esc(m.standingsPage.title)}</h2>`;
    for (const g of standings(b, ch.pairs)) {
      const t = g.kind === 'champion' ? m.standingsPage.champion : g.kind === 'alive' ? m.standingsPage.alive : g.kind === 'runnerUp' ? m.standingsPage.runnerUp : roundEliminated(m, g.round!, b.rounds);
      body += `<div class="group"><h3>${esc(t)}${g.kind !== 'alive' ? `<em>${esc(m.standingsPage.position(g.from, g.to))}</em>` : ''}</h3>${g.pairIds.map((id) => pairHtml(pairs.get(id))).join('')}</div>`;
    }
    body += `<h2>${esc(m.bracketPage.title)}</h2>`;
    b.rounds.forEach((r, i) => {
      body += `<h3 class="round">${esc(roundName(m, r, b.rounds))}</h3><div class="grid">`;
      for (const mt of b.matches.filter((x) => x.round === i).sort((x, y) => x.position - y.position)) {
        const [pa, pb] = matchPairs(b, mt);
        const cls = (side: 'A' | 'B') => (mt.winner === side ? 'win' : mt.winner ? 'lose' : '');
        body += `<div class="match"><small>${esc(m.common.match)} ${mt.number}</small>${pairHtml(pa ? pairs.get(pa) : undefined, cls('A'))}${pairHtml(pb ? pairs.get(pb) : undefined, cls('B'))}</div>`;
      }
      if (i === 0) for (const bye of b.byes) body += `<div class="match bye"><small>${esc(m.status.bye)}</small>${pairHtml(pairs.get(bye.pairId))}</div>`;
      body += '</div>';
    });
  }
  body += `<h2>${esc(m.pairsPage.title)}</h2><div class="grid">${ch.pairs
    .slice()
    .sort((x, y) => x.number - y.number)
    .map((p) => pairHtml(p))
    .join('')}</div>`;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>${esc(ch.name)} · URRIZPE MUS</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8f3e6;color:#25282a}
header{background:#12432f;color:#f8f3e6;padding:18px 20px;border-bottom:3px solid #c9a227;display:flex;gap:14px;align-items:center}
header img{width:112px;height:55px;flex:none}header h1{margin:0;font-family:Georgia,serif;font-size:22px}header p{margin:4px 0 0;color:#e3c766;font-size:13px}
main{max-width:1100px;margin:0 auto;padding:16px}h2{font-family:Georgia,serif;color:#0d3324;border-bottom:1px solid #c9a22766;padding-bottom:6px;margin-top:28px}
h3{font-size:15px;color:#12432f;display:flex;justify-content:space-between;margin:14px 0 8px}h3 em{color:#7f6414;font-style:normal}
.note{background:#fff;border:1px solid #0001;border-radius:12px;padding:10px 12px;font-size:13px;color:#4d5154}
.grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.match{background:#fff;border:1px solid #12432f22;border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:4px}.match>small{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#6b6f72}
.bye{border-style:dashed;border-color:#c9a227;background:#fbf3d8}
.p{display:flex;gap:8px;align-items:center;padding:4px;border-radius:8px}.p b{background:#12432f;color:#e3c766;border-radius:6px;min-width:28px;text-align:center;padding:3px 5px}
.p strong{display:block;font-size:14px}.p small{display:block;color:#6b6f72;font-size:12px}.p.win{background:#e8f1ec}.p.lose{opacity:.5;text-decoration:line-through}.p.tbd{color:#8a8d8f;font-style:italic}
.group{background:#fff;border-radius:12px;padding:6px 12px 10px;margin-bottom:8px;border:1px solid #0001}
.champ{background:#12432f;color:#f8f3e6;border:2px solid #c9a227;border-radius:16px;padding:16px;text-align:center;margin-top:16px}.champ p{margin:0 0 8px;color:#e3c766;letter-spacing:.2em;font-weight:800;font-size:12px;text-transform:uppercase}.champ .p{justify-content:center}.champ .p strong{font-size:20px}.champ .p small{color:#e2d5b6}
footer{text-align:center;color:#8a8d8f;font-size:12px;padding:24px}
</style></head><body>
<header><img src="${fanSmall}" alt="" width="112" height="55"><div><h1>${esc(ch.name)}</h1><p>${esc(formatDate(ch.date))} · URRIZPE MUS</p></div></header>
<main><p class="note">${esc(m.publicView.readonly)} ${esc(formatDate(new Date().toISOString(), true))}.</p>${ch.description ? `<p>${esc(ch.description)}</p>` : ''}${body}</main>
<footer>URRIZPE MUS</footer></body></html>`;
}
