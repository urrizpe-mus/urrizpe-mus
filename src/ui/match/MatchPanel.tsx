import { Check, Crown, Hourglass, Pencil, ArrowRight } from 'lucide-react';
import { matchPairs, matchState, parentOf } from '../../domain/bracket';
import type { Championship, Match, Side } from '../../domain/types';
import { roundName, useT } from '../../i18n';
import { PairLine, usePairIndex } from '../components/pair';
import { Badge, Button, Card, cn } from '../components/ui';
import { useWinnerFlow } from './WinnerFlow';

function sourceText(ch: Championship, side: Side, m: ReturnType<typeof useT>): string {
  if (side.from === 'match') {
    const src = ch.bracket!.matches.find((x) => x.id === side.matchId);
    return src ? m.matchesPage.waitingFor(src.number) : m.common.tbd;
  }
  return m.common.tbd;
}

/**
 * Tarjeta grande de partido: dos parejas y un botón «Seleccionar como
 * ganadora» bajo cada una. Pensada para usarse con el pulgar en el móvil.
 */
export function MatchPanel({ ch, match, readOnly = false }: { ch: Championship; match: Match; readOnly?: boolean }) {
  const m = useT();
  const pairs = usePairIndex(ch);
  const flow = useWinnerFlow();
  const bracket = ch.bracket!;
  const state = matchState(bracket, match);
  const [a, b] = matchPairs(bracket, match);
  const isFinal = match.round === bracket.rounds.length - 1;
  const winnerId = match.winner === 'A' ? a : match.winner === 'B' ? b : null;
  const parent = parentOf(bracket, match.id);
  const canPlay = !readOnly && ch.drawStatus === 'confirmed';

  const sideBlock = (pairId: string | null, side: Side, key: string) => {
    const pair = pairId ? pairs.get(pairId) : undefined;
    const isWinner = !!pairId && pairId === winnerId;
    const isLoser = !!winnerId && !!pairId && !isWinner;
    return (
      <div
        key={key}
        className={cn(
          'flex min-w-0 flex-col gap-3 rounded-2xl border p-3 transition-colors',
          isWinner ? (isFinal ? 'border-gold-500 bg-gold-100/70' : 'border-bottle-600 bg-bottle-50') : 'border-bottle-900/10 bg-white/70',
          isLoser && 'opacity-60',
        )}
      >
        <div className="flex min-h-12 min-w-0 flex-wrap items-center justify-between gap-2">
          {pair ? (
            <PairLine pair={pair} size="lg" className="min-w-[11rem] flex-1" tone={isWinner ? (isFinal ? 'gold' : 'green') : isLoser ? 'muted' : 'green'} />
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-500">
              <Hourglass size={16} /> {sourceText(ch, side, m)}
            </p>
          )}
          {side.from === 'bye' && <Badge tone="gold">{m.status.bye}</Badge>}
        </div>
        {isWinner && (
          <p className={cn('flex items-center gap-1.5 text-sm font-bold', isFinal ? 'text-gold-700' : 'text-bottle-700')}>
            {isFinal ? <Crown size={18} /> : <Check size={18} />} {isFinal ? m.status.champion : m.matchesPage.winner}
          </p>
        )}
        {isLoser && <p className="text-sm font-bold text-wine-700">{m.matchesPage.eliminated}</p>}
        {state === 'ready' && canPlay && pair && (
          <Button size="lg" variant={isFinal ? 'gold' : 'primary'} className="w-full uppercase tracking-wide" onClick={() => flow.choose(match, pair.id)}>
            {m.matchesPage.selectWinner}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card as="article" className="p-3 sm:p-4">
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-bottle-900">
            {m.common.match} {match.number}
          </p>
          <p className="truncate text-xs font-bold tracking-wider text-gold-600 uppercase">{roundName(m, bracket.rounds[match.round], bracket.rounds)}</p>
        </div>
        <Badge tone={state === 'finished' ? 'green' : state === 'ready' ? 'gold' : 'neutral'}>
          {state === 'finished' ? m.status.matchFinished : state === 'ready' ? m.status.matchReady : m.status.matchWaiting}
        </Badge>
      </header>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
        {sideBlock(a, match.sideA, 'a')}
        <div className="flex items-center justify-center gap-3 py-0.5 text-xs font-extrabold tracking-[0.3em] text-ink-400 uppercase md:flex-col md:px-1">
          <span className="h-px w-8 bg-ink-400/40 md:h-8 md:w-px" />
          {m.common.vs}
          <span className="h-px w-8 bg-ink-400/40 md:h-8 md:w-px" />
        </div>
        {sideBlock(b, match.sideB, 'b')}
      </div>
      {state === 'finished' && (
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="flex items-center gap-1.5 text-sm text-ink-600">
            {parent ? (
              <>
                <ArrowRight size={16} className="text-gold-600" />
                {m.matchesPage.advancesTo(roundName(m, bracket.rounds[parent.match.round], bracket.rounds), parent.match.number)}
              </>
            ) : (
              <>
                <Crown size={16} className="text-gold-600" /> {m.matchesPage.becomesChampion}
              </>
            )}
          </p>
          {canPlay && (
            <Button size="sm" variant="ghost" icon={<Pencil size={15} />} onClick={() => flow.correct(match)}>
              {m.matchesPage.correct}
            </Button>
          )}
        </footer>
      )}
    </Card>
  );
}
