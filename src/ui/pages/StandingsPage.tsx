import { Crown, Medal, Printer } from 'lucide-react';
import { standings, type StandingGroup } from '../../domain/standings';
import type { Championship } from '../../domain/types';
import { roundEliminated, useT } from '../../i18n';
import { useChampionship } from '../../state/championship';
import { PairLine, usePairIndex } from '../components/pair';
import { Button, Card, EmptyState, PageHeader, cn } from '../components/ui';

export function StandingsList({ ch }: { ch: Championship }) {
  const m = useT();
  const pairs = usePairIndex(ch);
  const groups = standings(ch.bracket!, ch.pairs);
  const title = (g: StandingGroup) => {
    if (g.kind === 'champion') return m.standingsPage.champion;
    if (g.kind === 'alive') return m.standingsPage.alive;
    if (g.kind === 'runnerUp') return m.standingsPage.runnerUp;
    return roundEliminated(m, g.round!, ch.bracket!.rounds);
  };
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g, i) => (
        <Card
          as="section"
          key={i}
          className={cn('overflow-hidden', g.kind === 'champion' && 'border-2 border-gold-500', g.kind === 'alive' && 'border-dashed bg-cream-50/60')}
        >
          <header className={cn('flex items-center justify-between gap-3 px-4 py-3', g.kind === 'champion' ? 'felt text-cream-50' : 'border-b border-bottle-900/8')}>
            <h2 className={cn('flex items-center gap-2 text-lg font-semibold', g.kind === 'champion' && 'text-cream-50')}>
              {g.kind === 'champion' ? <Crown size={20} className="text-gold-300" /> : g.kind === 'runnerUp' ? <Medal size={20} className="text-gold-600" /> : null}
              {title(g)}
            </h2>
            {g.kind !== 'alive' && (
              <span className={cn('font-display text-lg font-semibold tabular-nums', g.kind === 'champion' ? 'text-gold-300' : 'text-gold-700')}>{m.standingsPage.position(g.from, g.to)}</span>
            )}
          </header>
          <ul className={cn('grid gap-2 p-3', g.pairIds.length > 1 && 'sm:grid-cols-2 xl:grid-cols-3')}>
            {g.pairIds.map((id) => (
              <li key={id} className="rounded-xl bg-white/70 px-2.5 py-2">
                <PairLine pair={pairs.get(id)!} tone={g.kind === 'champion' ? 'gold' : g.kind === 'eliminated' || g.kind === 'runnerUp' ? 'muted' : 'green'} size={g.kind === 'champion' ? 'lg' : 'md'} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function StandingsPage() {
  const m = useT();
  const { championship: ch } = useChampionship();
  if (!ch.bracket || ch.drawStatus !== 'confirmed') {
    return (
      <div>
        <PageHeader title={m.standingsPage.title} />
        <EmptyState icon={<Medal size={40} />} title={m.standingsPage.empty} />
      </div>
    );
  }
  return (
    <div className="print-area">
      <PageHeader
        title={m.standingsPage.title}
        subtitle={m.standingsPage.subtitle}
        actions={
          <Button variant="outline" className="no-print" icon={<Printer size={17} />} onClick={() => window.print()}>
            {m.common.print}
          </Button>
        }
      />
      <StandingsList ch={ch} />
    </div>
  );
}
