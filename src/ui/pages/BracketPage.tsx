import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, GitFork, Hand, LayoutList, Maximize2, Printer, Shuffle, SkipForward } from 'lucide-react';
import { matchState } from '../../domain/bracket';
import type { Bracket, Match } from '../../domain/types';
import { roundShort, useT } from '../../i18n';
import { useChampionship } from '../../state/championship';
import { BracketRounds, BracketTree, ZoomControls, bracketLayout } from '../bracket/Bracket';
import { MatchPanel } from '../match/MatchPanel';
import { Button, EmptyState, Modal, Notice, PageHeader, cn } from '../components/ui';

export function useIsDesktop(query = '(min-width: 1024px)') {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true);
  const [v, setV] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setV(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return v;
}

/** Siguiente partido listo para jugar (ronda más baja primero). */
export function nextReadyMatch(bracket: Bracket, after?: Match | null): Match | null {
  const ready = bracket.matches
    .filter((x) => matchState(bracket, x) === 'ready')
    .sort((a, b) => a.round - b.round || a.position - b.position);
  if (!ready.length) return null;
  if (after) {
    const later = ready.find((x) => x.round > after.round || (x.round === after.round && x.position > after.position));
    if (later) return later;
  }
  return ready[0];
}

/**
 * Arrastrar con el ratón para mover el cuadro (en táctil ya se mueve con el dedo).
 * Si se arrastra, se anula el clic para no abrir un partido sin querer.
 */
function useDragToScroll(ref: RefObject<HTMLDivElement | null>) {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number; left: number; top: number } | null = null;
    let moved = false;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
      moved = false;
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) {
        moved = true;
        setDragging(true);
        el.setPointerCapture(e.pointerId);
      }
      el.scrollLeft = start.left - dx;
      el.scrollTop = start.top - dy;
    };
    const up = (e: PointerEvent) => {
      if (start && moved && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      start = null;
      setDragging(false);
    };
    const click = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('click', click, true);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('click', click, true);
    };
  }, [ref]);
  return dragging;
}

export function BracketPage() {
  const m = useT();
  const { championship: ch } = useChampionship();
  const desktop = useIsDesktop();
  const [view, setView] = useState<'tree' | 'rounds' | null>(null);
  const [scale, setScale] = useState(1);
  const [open, setOpen] = useState<Match | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const dragging = useDragToScroll(treeRef);
  const current = view ?? (desktop ? 'tree' : 'rounds');
  const bracket = ch.bracket;
  const confirmed = ch.drawStatus === 'confirmed';

  // Desplaza el cuadro completo hasta una posición del lienzo (sin escalar).
  const scrollTreeTo = useCallback(
    (x: number, y: number, smooth = true) => {
      const el = treeRef.current;
      if (!el) return;
      el.scrollTo({ left: Math.max(0, x * scale - 24), top: Math.max(0, y * scale - el.clientHeight / 3), behavior: smooth ? 'smooth' : 'auto' });
    },
    [scale],
  );

  const showMatch = useCallback(
    (mt: Match, smooth = true) => {
      setHighlight(mt.id);
      if (current === 'tree' && bracket) {
        const it = bracketLayout(bracket).items.find((i) => i.match?.id === mt.id);
        if (it) scrollTreeTo(it.x, it.y, smooth);
      } else {
        requestAnimationFrame(() =>
          document.querySelector(`[data-match-id="${mt.id}"]`)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center', inline: 'nearest' }),
        );
      }
    },
    [current, bracket, scrollTreeTo],
  );

  // Al abrir el cuadro completo, situarse en el primer partido pendiente.
  useEffect(() => {
    if (current !== 'tree' || !bracket) return;
    const next = nextReadyMatch(bracket) ?? bracket.matches.find((x) => !x.winner);
    if (next) {
      const it = bracketLayout(bracket).items.find((i) => i.match?.id === next.id);
      if (it) requestAnimationFrame(() => scrollTreeTo(it.x, it.y, false));
    }
    // Solo al entrar en la vista o al cambiar el zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, scale]);

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 2200);
    return () => clearTimeout(t);
  }, [highlight]);

  if (!bracket || ch.drawStatus === 'none') {
    return (
      <div>
        <PageHeader title={m.bracketPage.title} />
        <EmptyState
          icon={<GitFork size={40} className="rotate-90" />}
          title={m.bracketPage.noDraw}
          action={
            <Link to={`/c/${ch.id}/sorteo`}>
              <Button icon={<Shuffle size={18} />}>{m.dashboard.goDraw}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const live = open ? bracket.matches.find((x) => x.id === open.id) ?? null : null;
  const next = nextReadyMatch(bracket);
  const nextAfterLive = live ? nextReadyMatch(bracket, live) : null;

  const openNext = (after?: Match | null) => {
    const target = after !== undefined ? nextReadyMatch(bracket, after) : next;
    if (!target) return;
    showMatch(target);
    setOpen(target);
  };

  const goRound = (r: number) => {
    const { colX } = bracketLayout(bracket);
    const first = bracket.matches.filter((x) => x.round === r).sort((a, b) => Number(!!a.winner) - Number(!!b.winner) || a.position - b.position)[0];
    const it = first ? bracketLayout(bracket).items.find((i) => i.match?.id === first.id) : null;
    scrollTreeTo(colX(r), it ? it.y : 0);
  };

  const fit = () => {
    const el = treeRef.current;
    if (!el) return;
    const { width, height } = bracketLayout(bracket);
    const s = Math.min(1, (el.clientWidth - 16) / width, (el.clientHeight - 60) / height);
    setScale(Math.max(0.4, +s.toFixed(2)));
  };

  return (
    <div>
      <PageHeader
        title={m.bracketPage.title}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-cream-50 p-1 ring-1 ring-bottle-900/12" role="tablist">
              {(['rounds', 'tree'] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={current === v}
                  onClick={() => setView(v)}
                  className={cn('flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold', current === v ? 'bg-bottle-800 text-cream-50' : 'text-bottle-900')}
                >
                  {v === 'rounds' ? <LayoutList size={16} /> : <GitFork size={16} className="rotate-90" />}
                  {v === 'rounds' ? m.bracketPage.viewRounds : m.bracketPage.viewTree}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-11" icon={<Printer size={16} />} onClick={() => window.print()}>
              {m.common.print}
            </Button>
          </div>
        }
      />
      {ch.drawStatus === 'preview' && (
        <div className="mb-4">
          <Notice tone="gold">{m.bracketPage.previewBanner}</Notice>
        </div>
      )}

      {confirmed && (
        <div className="no-print mb-3">
          {next ? (
            <Button variant="gold" size="lg" className="w-full sm:w-auto" icon={<SkipForward size={19} />} onClick={() => openNext()}>
              {m.bracketPage.nextMatch(next.number)}
            </Button>
          ) : (
            <Notice tone="green" icon={<Crown size={17} />}>
              {m.dashboard.stepDone}
            </Notice>
          )}
        </div>
      )}

      {current === 'tree' ? (
        <>
          <div className="no-print mb-2 flex flex-wrap items-center gap-2">
            <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {bracket.rounds.map((r, i) => (
                <button key={i} onClick={() => goRound(i)} className="h-9 shrink-0 rounded-full bg-cream-50 px-3.5 text-sm font-bold text-bottle-900 ring-1 ring-bottle-900/12 hover:bg-white">
                  {roundShort(m, r, bracket.rounds)}
                </button>
              ))}
              <button
                onClick={() => {
                  const { colX, height } = bracketLayout(bracket);
                  scrollTreeTo(colX(bracket.rounds.length), height / 2);
                }}
                aria-label={m.bracketPage.champion}
                className="flex h-9 shrink-0 items-center rounded-full bg-cream-50 px-3 text-gold-700 ring-1 ring-bottle-900/12 hover:bg-white"
              >
                <Crown size={16} />
              </button>
            </div>
            <ZoomControls scale={scale} setScale={setScale} />
            <Button variant="outline" size="sm" icon={<Maximize2 size={15} />} onClick={fit}>
              {m.bracketPage.fit}
            </Button>
          </div>
          <p className="no-print mb-2 hidden items-center gap-1.5 text-xs text-ink-500 lg:flex">
            <Hand size={14} /> {m.bracketPage.dragHint}
          </p>
          <div
            ref={treeRef}
            className={cn(
              'print-area relative h-[calc(100dvh-300px)] min-h-[420px] overflow-auto overscroll-contain rounded-2xl border border-bottle-900/10 bg-cream-50/60 scrollbar-thin print:h-auto',
              dragging ? 'cursor-grabbing select-none' : 'lg:cursor-grab',
            )}
          >
            <div className="p-3 sm:p-4">
              <BracketTree ch={ch} scale={scale} highlight={highlight} onOpen={confirmed ? setOpen : undefined} />
            </div>
          </div>
        </>
      ) : (
        <BracketRounds ch={ch} highlight={highlight} onOpen={confirmed ? setOpen : undefined} />
      )}

      <Modal
        open={!!live}
        onClose={() => setOpen(null)}
        title={live ? `${m.common.match} ${live.number}` : ''}
        size="lg"
        footer={
          live?.winner ? (
            <>
              <Button variant="outline" onClick={() => setOpen(null)}>
                {m.nav.close}
              </Button>
              {nextAfterLive && (
                <Button icon={<ArrowRight size={18} />} onClick={() => openNext(live)}>
                  {m.bracketPage.nextMatch(nextAfterLive.number)}
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {live && <MatchPanel ch={ch} match={live} />}
      </Modal>
    </div>
  );
}
