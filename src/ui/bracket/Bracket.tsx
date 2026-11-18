import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Crown, Hourglass, ZoomIn, ZoomOut } from 'lucide-react';
import { championOf, matchPairs, matchState } from '../../domain/bracket';
import type { Bracket as BracketData, Championship, Match, Pair } from '../../domain/types';
import { roundName, roundShort, useT } from '../../i18n';
import { pairTexts, usePairIndex } from '../components/pair';
import { Button, cn } from '../components/ui';

/* ------------------------------------------------------------------------- */
/* Tarjeta compacta de partido                                               */
/* ------------------------------------------------------------------------- */

const CARD_W = 236;
const CARD_H = 112;
const SLOT_H = 128;
const COL_GAP = 52;

function Row({ pair, state, fallback, bye }: { pair?: Pair; state: 'win' | 'lose' | 'open'; fallback: string; bye?: boolean }) {
  const m = useT();
  if (!pair) {
    return (
      <div className="flex h-10 items-center gap-2 px-2 text-xs text-ink-400">
        <Hourglass size={13} />
        <span className="truncate">{fallback}</span>
      </div>
    );
  }
  const { title, subtitle } = pairTexts(pair);
  return (
    <div className={cn('flex h-10 items-center gap-2 rounded-lg px-2', state === 'win' && 'bg-bottle-800/8', state === 'lose' && 'opacity-50')}>
      <span
        className={cn(
          'flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 font-display text-[13px] font-semibold tabular-nums',
          state === 'win' ? 'bg-bottle-800 text-gold-300' : 'bg-ink-800/8 text-ink-700',
        )}
      >
        {pair.number}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className={cn('block truncate text-[13px] font-semibold', state === 'lose' ? 'text-ink-500 line-through decoration-ink-400/60' : 'text-ink-900')}>{title}</span>
        {subtitle && <span className="block truncate text-[11px] text-ink-500">{subtitle}</span>}
        {!subtitle && bye && <span className="block truncate text-[11px] font-semibold text-gold-700">{m.status.bye}</span>}
      </span>
      {state === 'win' && <Check size={16} className="shrink-0 text-bottle-700" aria-label="Ganadora" />}
    </div>
  );
}

export function BracketMatchCard({ ch, match, onOpen, className }: { ch: Championship; match: Match; onOpen?: (m: Match) => void; className?: string }) {
  const m = useT();
  const pairs = usePairIndex(ch);
  const bracket = ch.bracket!;
  const [a, b] = matchPairs(bracket, match);
  const state = matchState(bracket, match);
  const isFinal = match.round === bracket.rounds.length - 1;
  const fallback = (side: Match['sideA']) => {
    if (side.from !== 'match') return m.common.tbd;
    const src = bracket.matches.find((x) => x.id === side.matchId);
    return src ? m.common.winnerOf(src.number) : m.common.tbd;
  };
  const rowState = (id: string | null, side: 'A' | 'B') => (!match.winner || !id ? 'open' : match.winner === side ? 'win' : 'lose');
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      onClick={onOpen ? () => onOpen(match) : undefined}
      aria-label={`${m.common.match} ${match.number}`}
      className={cn(
        'flex w-full flex-col rounded-xl border bg-cream-50 p-1.5 text-left shadow-[var(--shadow-card)] transition',
        onOpen && 'cursor-pointer hover:-translate-y-px hover:border-bottle-600/50 hover:shadow-[var(--shadow-lift)]',
        state === 'ready' ? 'border-gold-500/70 ring-2 ring-gold-400/25' : isFinal && match.winner ? 'border-gold-500' : 'border-bottle-900/12',
        className,
      )}
    >
      <span className="flex items-center justify-between px-1.5 pb-0.5 text-[10px] font-extrabold tracking-[0.12em] uppercase">
        <span className="text-ink-500">
          {m.common.match} {match.number}
        </span>
        <span className={cn(state === 'finished' ? 'text-bottle-700' : state === 'ready' ? 'text-gold-700' : 'text-ink-400')}>
          {state === 'finished' ? m.status.matchFinished : state === 'ready' ? m.status.matchReady : m.status.matchWaiting}
        </span>
      </span>
      <Row pair={a ? pairs.get(a) : undefined} state={rowState(a, 'A')} fallback={fallback(match.sideA)} bye={match.sideA.from === 'bye'} />
      <Row pair={b ? pairs.get(b) : undefined} state={rowState(b, 'B')} fallback={fallback(match.sideB)} bye={match.sideB.from === 'bye'} />
    </Tag>
  );
}

export function ByeCard({ pair, className }: { pair: Pair; className?: string }) {
  const m = useT();
  const { title, subtitle } = pairTexts(pair);
  return (
    <div className={cn('flex w-full items-center gap-2 rounded-xl border border-dashed border-gold-500/70 bg-gold-100/50 px-2.5 py-2', className)}>
      <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-gold-500 px-1 font-display text-sm font-semibold text-bottle-950">{pair.number}</span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13px] font-semibold text-ink-900">{title}</span>
        <span className="block truncate text-[10px] font-extrabold tracking-wider text-gold-700 uppercase">
          {m.bracketPage.byeCard}
          {subtitle && <span className="font-medium tracking-normal normal-case text-ink-500"> · {subtitle}</span>}
        </span>
      </span>
    </div>
  );
}

function ChampionCard({ ch }: { ch: Championship }) {
  const m = useT();
  const pairs = usePairIndex(ch);
  const champ = championOf(ch.bracket!);
  const pair = champ ? pairs.get(champ) : undefined;
  return (
    <div className={cn('flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center', pair ? 'felt border-gold-500 text-cream-50 shadow-[var(--shadow-lift)]' : 'border-dashed border-gold-500/50 bg-cream-50 text-ink-500')}>
      <Crown size={26} className={pair ? 'text-gold-300' : 'text-gold-500/60'} />
      <span className="text-[10px] font-extrabold tracking-[0.2em] text-gold-400 uppercase">{m.bracketPage.champion}</span>
      {pair ? (
        <>
          <span className="font-display text-lg leading-tight font-semibold">
            {pair.number} · {pairTexts(pair).title}
          </span>
          {pairTexts(pair).subtitle && <span className="text-xs text-cream-100/75">{pairTexts(pair).subtitle}</span>}
        </>
      ) : (
        <span className="text-sm">{m.common.tbd}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Geometría del cuadro completo                                             */
/* ------------------------------------------------------------------------- */

interface Item {
  key: string;
  round: number;
  x: number;
  y: number; // centro vertical
  match?: Match;
  byePairId?: string;
}

export function bracketLayout(bracket: BracketData) {
  const units = bracket.rounds[0].target;
  const items: Item[] = [];
  const colX = (r: number) => r * (CARD_W + COL_GAP);
  const centerY = (r: number, j: number) => (j + 0.5) * SLOT_H * 2 ** r;
  for (const mt of bracket.matches) {
    items.push({ key: mt.id, round: mt.round, x: colX(mt.round), y: centerY(mt.round, mt.position), match: mt });
  }
  for (const b of bracket.byes) {
    items.push({ key: `bye-${b.pairId}`, round: 0, x: colX(0), y: centerY(0, b.position), byePairId: b.pairId });
  }
  const height = Math.max(units * SLOT_H, SLOT_H);
  const width = colX(bracket.rounds.length) + CARD_W;
  return { items, height, width, colX, centerY };
}

/** Cuadro completo con líneas de conexión entre rondas. */
export function BracketTree({ ch, onOpen, scale = 1, highlight }: { ch: Championship; onOpen?: (m: Match) => void; scale?: number; highlight?: string | null }) {
  const m = useT();
  const pairs = usePairIndex(ch);
  const bracket = ch.bracket!;
  const { items, height, width, colX, centerY } = useMemo(() => bracketLayout(bracket), [bracket]);
  const rounds = bracket.rounds;
  const last = rounds.length - 1;

  // Líneas: cada unidad/partido conecta con su partido padre.
  const lines: { d: string; on: boolean }[] = [];
  for (const it of items) {
    const pos = it.match ? it.match.position : bracket.byes.find((b) => `bye-${b.pairId}` === it.key)!.position;
    const r = it.round;
    const x1 = it.x + CARD_W;
    let x2: number;
    let y2: number;
    let on: boolean;
    if (r === last) {
      x2 = colX(r + 1);
      y2 = height / 2;
      on = !!it.match?.winner;
    } else {
      x2 = colX(r + 1);
      y2 = centerY(r + 1, Math.floor(pos / 2));
      on = it.match ? !!it.match.winner : true;
    }
    const xm = x1 + COL_GAP / 2;
    lines.push({ d: `M${x1} ${it.y}H${xm}V${y2}H${x2}`, on });
  }

  return (
    <div style={{ width: width * scale }} className="relative">
      {/* Cabeceras de ronda: fijas arriba mientras se recorre el cuadro */}
      <div className="sticky top-0 z-10 bg-cream-100/95 backdrop-blur-sm" style={{ height: 52 * scale }}>
        <div style={{ width, height: 52, transform: `scale(${scale})`, transformOrigin: '0 0' }} className="absolute top-0 left-0">
          {[...rounds, null].map((r, i) => (
            <div key={i} data-round-col={i} className="absolute top-1.5 text-center" style={{ left: colX(i), width: CARD_W }}>
              <p className="font-display text-[15px] font-semibold text-bottle-900">{r ? roundName(m, r, rounds) : m.bracketPage.champion}</p>
              {r && <p className="text-[11px] font-semibold text-ink-500">{m.plan.matches(r.matches)}{r.byes ? ` · ${m.plan.byes(r.byes)}` : ''}</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="relative" style={{ height: (height + 8) * scale }}>
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: '0 0' }} className="absolute top-2 left-0">
        <div className="absolute top-0 left-0" style={{ width, height }}>
          <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
            {lines
              .filter((l) => !l.on)
              .map((l, i) => (
                <path key={`off${i}`} d={l.d} fill="none" stroke="var(--color-ink-400)" strokeOpacity="0.45" strokeWidth="1.5" />
              ))}
            {lines
              .filter((l) => l.on)
              .map((l, i) => (
                <path key={`on${i}`} d={l.d} fill="none" stroke="var(--color-gold-500)" strokeWidth="2.25" />
              ))}
          </svg>
          {items.map((it) => (
            <div
              key={it.key}
              data-match-id={it.match?.id}
              className={cn('absolute rounded-xl transition-shadow duration-500', it.match && highlight === it.match.id && 'ring-4 ring-gold-400')}
              style={{ left: it.x, top: it.y - (it.match ? CARD_H / 2 : 26), width: CARD_W }}
            >
              {it.match ? (
                <BracketMatchCard ch={ch} match={it.match} onOpen={onOpen} className="h-[112px]" />
              ) : (
                <ByeCard pair={pairs.get(it.byePairId!)!} className="h-[52px]" />
              )}
            </div>
          ))}
          <div data-champion className="absolute" style={{ left: colX(rounds.length), top: height / 2 - 60, width: CARD_W }}>
            <ChampionCard ch={ch} />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Vista por rondas (móvil): columnas deslizables con scroll-snap            */
/* ------------------------------------------------------------------------- */

export function BracketRounds({ ch, onOpen, highlight }: { ch: Championship; onOpen?: (m: Match) => void; highlight?: string | null }) {
  const m = useT();
  const pairs = usePairIndex(ch);
  const bracket = ch.bracket!;
  const rounds = bracket.rounds;
  const scroller = useRef<HTMLDivElement>(null);
  const firstPending = Math.max(0, rounds.findIndex((_, r) => bracket.matches.some((x) => x.round === r && !x.winner)));
  const [active, setActive] = useState(firstPending);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const col = el.children[firstPending] as HTMLElement | undefined;
    if (col) el.scrollTo({ left: col.offsetLeft - el.offsetLeft, behavior: 'auto' });
    // Solo al montar: después manda el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (i: number) => {
    const el = scroller.current;
    const col = el?.children[i] as HTMLElement | undefined;
    if (el && col) el.scrollTo({ left: col.offsetLeft - el.offsetLeft, behavior: 'smooth' });
    setActive(i);
  };

  // Permite a la pantalla pedir que se muestre una ronda concreta (p. ej. «siguiente partido»).
  useEffect(() => {
    if (!highlight) return;
    const mt = bracket.matches.find((x) => x.id === highlight);
    if (mt) goTo(mt.round);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? el.clientWidth;
    const i = Math.round(el.scrollLeft / (w + 12));
    if (i !== active) setActive(Math.min(rounds.length, Math.max(0, i)));
  };

  return (
    <div>
      <div className="no-print sticky top-14 z-10 -mx-4 mb-3 flex items-center gap-1.5 bg-cream-100/95 px-4 py-2 backdrop-blur-sm sm:mx-0 sm:px-0 lg:top-0">
        <button type="button" aria-label="Ronda anterior" disabled={active === 0} onClick={() => goTo(active - 1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-50 text-bottle-900 ring-1 ring-bottle-900/12 disabled:opacity-35">
          <ChevronLeft size={20} />
        </button>
      <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-thin" role="tablist">
        {[...rounds, null].map((r, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={active === i}
            onClick={() => goTo(i)}
            className={cn(
              'h-10 shrink-0 rounded-full px-4 text-sm font-bold transition',
              active === i ? 'bg-bottle-800 text-cream-50' : 'bg-cream-50 text-bottle-900 ring-1 ring-bottle-900/12',
            )}
          >
            {r ? roundShort(m, r, rounds) : <Crown size={16} className="inline" />}
          </button>
        ))}
      </div>
        <button type="button" aria-label="Ronda siguiente" disabled={active === rounds.length} onClick={() => goTo(active + 1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-50 text-bottle-900 ring-1 ring-bottle-900/12 disabled:opacity-35">
          <ChevronRight size={20} />
        </button>
      </div>
      <div ref={scroller} onScroll={onScroll} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scrollbar-thin sm:mx-0 sm:px-0">
        {rounds.map((r, i) => {
          const ms = bracket.matches.filter((x) => x.round === i).sort((x, y) => x.position - y.position);
          const byes = i === 0 ? bracket.byes : [];
          // En la primera ronda mezclamos partidos y pases directos en su orden de cuadro.
          const units: { pos: number; match?: Match; bye?: string }[] =
            i === 0 ? [...ms.map((x) => ({ pos: x.position, match: x })), ...byes.map((b) => ({ pos: b.position, bye: b.pairId }))].sort((x, y) => x.pos - y.pos) : ms.map((x) => ({ pos: x.position, match: x }));
          return (
            <section key={i} className="w-[86%] max-w-[420px] shrink-0 snap-start sm:w-[360px]" aria-label={roundName(m, r, rounds)}>
              <header className="mb-2 flex items-baseline justify-between px-1">
                <h3 className="text-lg font-semibold">{roundName(m, r, rounds)}</h3>
                <span className="text-xs font-semibold text-ink-500">
                  {m.plan.matches(r.matches)}
                  {r.byes ? ` · ${m.plan.byes(r.byes)}` : ''}
                </span>
              </header>
              <div className="flex flex-col gap-2">
                {units.map((u) =>
                  u.match ? (
                    <div key={u.match.id} data-match-id={u.match.id} className={cn('scroll-mt-32 rounded-xl transition-shadow duration-500', highlight === u.match.id && 'ring-4 ring-gold-400')}>
                      <BracketMatchCard ch={ch} match={u.match} onOpen={onOpen} />
                    </div>
                  ) : (
                    <ByeCard key={u.bye} pair={pairs.get(u.bye!)!} />
                  ),
                )}
              </div>
            </section>
          );
        })}
        <section className="w-[86%] max-w-[420px] shrink-0 snap-start sm:w-[360px]">
          <header className="mb-2 px-1">
            <h3 className="text-lg font-semibold">{m.bracketPage.champion}</h3>
          </header>
          <ChampionCard ch={ch} />
        </section>
      </div>
      <p className="mt-1 text-center text-xs text-ink-400 sm:hidden">{m.bracketPage.swipeHint}</p>
    </div>
  );
}

export function ZoomControls({ scale, setScale }: { scale: number; setScale: (s: number) => void }) {
  const m = useT();
  return (
    <div className="flex items-center gap-1 rounded-xl bg-cream-50 p-1 ring-1 ring-bottle-900/12">
      <Button size="sm" variant="ghost" aria-label={m.bracketPage.zoomOut} onClick={() => setScale(Math.max(0.4, +(scale - 0.15).toFixed(2)))} icon={<ZoomOut size={17} />} />
      <span className="w-12 text-center text-sm font-semibold tabular-nums">{Math.round(scale * 100)}%</span>
      <Button size="sm" variant="ghost" aria-label={m.bracketPage.zoomIn} onClick={() => setScale(Math.min(1.3, +(scale + 0.15).toFixed(2)))} icon={<ZoomIn size={17} />} />
    </div>
  );
}
