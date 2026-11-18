import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Crown, RotateCcw } from 'lucide-react';
import { dependentDecidedMatches, matchPairs, winnerOf } from '../../domain/bracket';
import { correctMatch, setWinner } from '../../domain/championship';
import type { Match } from '../../domain/types';
import { pairLabel } from '../../domain/pairs';
import { roundName, useT } from '../../i18n';
import { useApp } from '../../state/app';
import { useChampionship } from '../../state/championship';
import { usePairIndex, PairLine } from '../components/pair';
import { Button, Modal, Notice, cn } from '../components/ui';

/**
 * Flujo único para registrar y corregir ganadoras. Lo usan la pantalla de
 * partidos, el cuadro y el panel, así el comportamiento es idéntico en todas.
 */
interface WinnerFlow {
  choose: (match: Match, pairId: string) => void;
  correct: (match: Match) => void;
}

const Ctx = createContext<WinnerFlow | null>(null);

export function useWinnerFlow(): WinnerFlow {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWinnerFlow fuera de WinnerFlowProvider');
  return ctx;
}

export function WinnerFlowProvider({ children }: { children: ReactNode }) {
  const m = useT();
  const { settings, toast } = useApp();
  const { championship: ch, apply, saving } = useChampionship();
  const pairs = usePairIndex(ch);
  const [pending, setPending] = useState<{ match: Match; pairId: string } | null>(null);
  const [correcting, setCorrecting] = useState<Match | null>(null);
  const [correctChoice, setCorrectChoice] = useState<string | null | undefined>(undefined);

  const bracket = ch.bracket;
  const lastRound = bracket ? bracket.rounds.length - 1 : -1;

  const commit = useCallback(
    async (match: Match, pairId: string) => {
      const pair = pairs.get(pairId);
      const saved = await apply((c) => setWinner(c, match.id, pairId));
      if (saved && pair) {
        toast(match.round === lastRound ? m.matchesPage.championToast(pair.number) : m.matchesPage.registered(pair.number));
      }
      setPending(null);
    },
    [apply, pairs, toast, m, lastRound],
  );

  const choose = useCallback(
    (match: Match, pairId: string) => {
      if (settings.confirmWinner) setPending({ match, pairId });
      else void commit(match, pairId);
    },
    [settings.confirmWinner, commit],
  );

  const correct = useCallback((match: Match) => {
    setCorrecting(match);
    setCorrectChoice(undefined);
  }, []);

  const value = useMemo(() => ({ choose, correct }), [choose, correct]);

  // Datos para el diálogo de confirmación.
  let confirmBody: ReactNode = null;
  if (pending && bracket) {
    const [a, b] = matchPairs(bracket, pending.match);
    const winner = pairs.get(pending.pairId)!;
    const loser = pairs.get(pending.pairId === a ? b! : a!)!;
    const isFinal = pending.match.round === lastRound;
    confirmBody = (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border-2 border-bottle-700 bg-bottle-50 p-3">
          <p className="mb-2 text-xs font-bold tracking-wider text-bottle-700 uppercase">{m.matchesPage.winner}</p>
          <PairLine pair={winner} size="lg" tone={isFinal ? 'gold' : 'green'} />
        </div>
        <div className="rounded-2xl border border-bottle-900/10 bg-white/60 p-3 opacity-80">
          <p className="mb-2 text-xs font-bold tracking-wider text-wine-700 uppercase">{m.matchesPage.eliminated}</p>
          <PairLine pair={loser} tone="wine" />
        </div>
        <p className="text-sm text-ink-600">
          {isFinal
            ? m.matchesPage.confirmFinal(`la pareja ${winner.number} (${pairLabel(winner)})`)
            : m.matchesPage.confirmText(pending.match.number, `la pareja ${winner.number}`, `La pareja ${loser.number}`)}
        </p>
      </div>
    );
  }

  let correctBody: ReactNode = null;
  if (correcting && bracket) {
    const live = bracket.matches.find((x) => x.id === correcting.id) ?? correcting;
    const [a, b] = matchPairs(bracket, live);
    const current = winnerOf(bracket, live);
    const dependents = dependentDecidedMatches(bracket, live.id);
    const options: { id: string | null; node: ReactNode }[] = [
      ...[a, b].filter((x): x is string => !!x).map((id) => ({ id, node: <PairLine pair={pairs.get(id)!} /> })),
      { id: null, node: <span className="flex items-center gap-2 font-semibold text-ink-700"><RotateCcw size={18} /> {m.matchesPage.setPending}</span> },
    ];
    correctBody = (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-600">{m.matchesPage.correctText}</p>
        <div className="flex flex-col gap-2" role="radiogroup">
          {options.map((o) => {
            const selected = correctChoice === undefined ? o.id === current : correctChoice === o.id;
            return (
              <button
                key={o.id ?? 'none'}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCorrectChoice(o.id)}
                className={cn(
                  'flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 text-left transition',
                  selected ? 'border-bottle-700 bg-bottle-50' : 'border-bottle-900/10 bg-white hover:border-bottle-900/30',
                )}
              >
                {o.node}
                {o.id === current && <span className="text-xs font-bold text-bottle-700">{m.matchesPage.winner}</span>}
              </button>
            );
          })}
        </div>
        {dependents.length > 0 ? (
          <Notice tone="wine" icon={<AlertTriangle size={18} />}>
            <p className="font-semibold">{m.matchesPage.correctDependents}</p>
            <ul className="mt-1.5 list-disc pl-5">
              {dependents.map((d) => (
                <li key={d.id}>
                  {m.common.match} {d.number} · {roundName(m, bracket.rounds[d.round], bracket.rounds)}
                </li>
              ))}
            </ul>
            <p className="mt-1.5">{m.matchesPage.correctOthers}</p>
          </Notice>
        ) : (
          <Notice tone="green">{m.matchesPage.correctNoDependents}</Notice>
        )}
      </div>
    );
  }

  const currentWinner = correcting && bracket ? winnerOf(bracket, bracket.matches.find((x) => x.id === correcting.id) ?? correcting) : null;
  const correctionChanges = correctChoice !== undefined && correctChoice !== currentWinner;

  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={
          pending && pending.match.round === lastRound ? (
            <span className="flex items-center gap-2">
              <Crown className="text-gold-500" size={22} /> {m.matchesPage.confirmTitle}
            </span>
          ) : (
            m.matchesPage.confirmTitle
          )
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setPending(null)}>
              {m.common.cancel}
            </Button>
            <Button data-autofocus disabled={saving} onClick={() => pending && commit(pending.match, pending.pairId)}>
              {m.matchesPage.register}
            </Button>
          </>
        }
      >
        {confirmBody}
      </Modal>
      <Modal
        open={!!correcting}
        onClose={() => setCorrecting(null)}
        title={correcting ? m.matchesPage.correctTitle(correcting.number) : ''}
        footer={
          <>
            <Button variant="outline" onClick={() => setCorrecting(null)}>
              {m.common.cancel}
            </Button>
            <Button
              variant="danger"
              disabled={!correctionChanges || saving}
              onClick={async () => {
                if (!correcting || correctChoice === undefined) return;
                const saved = await apply((c) => correctMatch(c, correcting.id, correctChoice).championship, m.matchesPage.corrected);
                if (saved) setCorrecting(null);
              }}
            >
              {m.common.confirm}
            </Button>
          </>
        }
      >
        {correctBody}
      </Modal>
    </Ctx.Provider>
  );
}
