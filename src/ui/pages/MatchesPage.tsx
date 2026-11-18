import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shuffle, Swords } from 'lucide-react';
import { matchPairs, matchState, type MatchState } from '../../domain/bracket';
import { matchesSearch } from '../../domain/pairs';
import { roundShort, useT } from '../../i18n';
import { useChampionship } from '../../state/championship';
import { MatchPanel } from '../match/MatchPanel';
import { usePairIndex } from '../components/pair';
import { Button, EmptyState, Input, Notice, PageHeader, cn } from '../components/ui';

type Filter = 'ready' | 'waiting' | 'finished' | 'all';

export function MatchesPage() {
  const m = useT();
  const { championship: ch } = useChampionship();
  const pairs = usePairIndex(ch);
  const [filter, setFilter] = useState<Filter>('ready');
  const [round, setRound] = useState<number | 'all'>('all');
  const [q, setQ] = useState('');
  const bracket = ch.bracket;

  if (!bracket || ch.drawStatus !== 'confirmed') {
    return (
      <div>
        <PageHeader title={m.matchesPage.title} />
        <EmptyState
          icon={<Swords size={40} />}
          title={m.matchesPage.notConfirmed}
          action={
            <Link to={`/c/${ch.id}/sorteo`}>
              <Button icon={<Shuffle size={18} />}>{m.dashboard.goDraw}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const counts: Record<MatchState, number> = { ready: 0, waiting: 0, finished: 0 };
  bracket.matches.forEach((x) => counts[matchState(bracket, x)]++);

  const list = bracket.matches
    .filter((x) => filter === 'all' || matchState(bracket, x) === filter)
    .filter((x) => round === 'all' || x.round === round)
    .filter((x) => {
      if (!q.trim()) return true;
      if (String(x.number) === q.trim()) return true;
      return matchPairs(bracket, x).some((id) => id && matchesSearch(pairs.get(id)!, q));
    })
    .sort((a, b) => (filter === 'finished' ? b.number - a.number : a.number - b.number));

  const filters: { id: Filter; label: string; n?: number }[] = [
    { id: 'ready', label: m.matchesPage.filterReady, n: counts.ready },
    { id: 'waiting', label: m.matchesPage.filterWaiting, n: counts.waiting },
    { id: 'finished', label: m.matchesPage.filterFinished, n: counts.finished },
    { id: 'all', label: m.matchesPage.filterAll, n: bracket.matches.length },
  ];

  return (
    <div>
      <PageHeader title={m.matchesPage.title} subtitle={m.matchesPage.subtitle} />
      <div className="mb-4 flex flex-col gap-2.5">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist">
          {filters.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn('flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold', filter === f.id ? 'bg-bottle-800 text-cream-50' : 'bg-cream-50 text-bottle-900 ring-1 ring-bottle-900/12')}
            >
              {f.label}
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', filter === f.id ? 'bg-gold-500 text-bottle-950' : 'bg-ink-800/8')}>{f.n}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={round}
            onChange={(e) => setRound(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="h-11 rounded-xl border border-bottle-900/15 bg-white px-3 text-[16px] font-semibold text-bottle-900 sm:w-56"
            aria-label={m.matchesPage.allRounds}
          >
            <option value="all">{m.matchesPage.allRounds}</option>
            {bracket.rounds.map((r, i) => (
              <option key={i} value={i}>
                {roundShort(m, r, bracket.rounds)}
              </option>
            ))}
          </select>
          <Input className="sm:max-w-xs" placeholder={m.pairsPage.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} aria-label={m.common.search} />
        </div>
      </div>
      {filter === 'ready' && counts.ready === 0 && counts.finished === bracket.matches.length ? (
        <Notice tone="green">{m.dashboard.stepDone}</Notice>
      ) : !list.length ? (
        <EmptyState title={m.matchesPage.noneReady} />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {list.map((x) => (
            <MatchPanel key={x.id} ch={ch} match={x} />
          ))}
        </div>
      )}
    </div>
  );
}
