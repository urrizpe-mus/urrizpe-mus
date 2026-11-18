import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitFork, LayoutList, Printer, Shuffle } from 'lucide-react';
import type { Match } from '../../domain/types';
import { useT } from '../../i18n';
import { useChampionship } from '../../state/championship';
import { BracketRounds, BracketTree, ZoomControls } from '../bracket/Bracket';
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

export function BracketPage() {
  const m = useT();
  const { championship: ch } = useChampionship();
  const desktop = useIsDesktop();
  const [view, setView] = useState<'tree' | 'rounds' | null>(null);
  const [scale, setScale] = useState(1);
  const [open, setOpen] = useState<Match | null>(null);
  const current = view ?? (desktop ? 'tree' : 'rounds');

  if (!ch.bracket || ch.drawStatus === 'none') {
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

  const live = open ? ch.bracket.matches.find((x) => x.id === open.id) ?? null : null;

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
            {current === 'tree' && <ZoomControls scale={scale} setScale={setScale} />}
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
      {current === 'tree' ? (
        <div className="print-area -mx-4 overflow-x-auto overscroll-x-contain px-4 pb-6 scrollbar-thin sm:mx-0 sm:rounded-2xl sm:border sm:border-bottle-900/10 sm:bg-cream-50/60 sm:p-5">
          <BracketTree ch={ch} scale={scale} onOpen={ch.drawStatus === 'confirmed' ? setOpen : undefined} />
        </div>
      ) : (
        <BracketRounds ch={ch} onOpen={ch.drawStatus === 'confirmed' ? setOpen : undefined} />
      )}
      <Modal open={!!live} onClose={() => setOpen(null)} title={live ? `${m.common.match} ${live.number}` : ''} size="lg">
        {live && <MatchPanel ch={ch} match={live} />}
      </Modal>
    </div>
  );
}
