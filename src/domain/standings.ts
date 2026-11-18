import { championOf, loserOf, matchPairs, matchState, winnerOf } from './bracket';
import type { Bracket, Match, Pair, RoundPlan } from './types';

/** Clave de traducción para el nombre de una ronda. */
export type RoundNameKey =
  | { key: 'final' }
  | { key: 'semifinal' }
  | { key: 'quarterfinal' }
  | { key: 'roundOf16' }
  | { key: 'roundOf32' }
  | { key: 'roundOfN'; n: number }
  | { key: 'prelim'; n: number; single: boolean };

export function roundNameKey(round: RoundPlan, rounds: RoundPlan[]): RoundNameKey {
  if (round.kind === 'prelim') {
    const prelims = rounds.filter((r) => r.kind === 'prelim').length;
    return { key: 'prelim', n: round.prelimNumber, single: prelims === 1 };
  }
  switch (round.entrants) {
    case 2:
      return { key: 'final' };
    case 4:
      return { key: 'semifinal' };
    case 8:
      return { key: 'quarterfinal' };
    case 16:
      return { key: 'roundOf16' };
    case 32:
      return { key: 'roundOf32' };
    default:
      return { key: 'roundOfN', n: round.entrants };
  }
}

export type PairStatus = 'registered' | 'pending' | 'bye' | 'qualified' | 'eliminated' | 'champion';

export interface PairProgress {
  status: PairStatus;
  /** Partido sin decidir en el que está (o estará) la pareja. */
  currentMatch: Match | null;
  /** Partido en el que fue eliminada. */
  lostIn: Match | null;
  wins: number;
  hadBye: boolean;
  /** Ronda más alta alcanzada (índice). */
  reachedRound: number;
}

/** Calcula el estado de todas las parejas en una sola pasada. */
export function pairProgressMap(bracket: Bracket | null, pairs: Pair[]): Map<string, PairProgress> {
  const map = new Map<string, PairProgress>();
  for (const p of pairs) {
    map.set(p.id, { status: 'registered', currentMatch: null, lostIn: null, wins: 0, hadBye: false, reachedRound: -1 });
  }
  if (!bracket) return map;
  for (const b of bracket.byes) {
    const pr = map.get(b.pairId);
    if (pr) {
      pr.hadBye = true;
      pr.reachedRound = Math.max(pr.reachedRound, 0);
    }
  }
  const sorted = bracket.matches.slice().sort((a, b) => a.round - b.round || a.position - b.position);
  for (const m of sorted) {
    const [a, b] = matchPairs(bracket, m);
    for (const id of [a, b]) {
      const pr = id ? map.get(id) : undefined;
      if (!pr) continue;
      pr.reachedRound = Math.max(pr.reachedRound, m.round);
      if (!m.winner) pr.currentMatch = m;
    }
    const w = winnerOf(bracket, m);
    const l = loserOf(bracket, m);
    if (w) map.get(w)!.wins++;
    if (l) map.get(l)!.lostIn = m;
  }
  const champion = championOf(bracket);
  for (const [id, pr] of map) {
    if (id === champion) pr.status = 'champion';
    else if (pr.lostIn) pr.status = 'eliminated';
    else if (pr.wins > 0) pr.status = 'qualified';
    else if (pr.hadBye) pr.status = 'bye';
    else pr.status = 'pending';
  }
  return map;
}

export interface StandingGroup {
  kind: 'champion' | 'runnerUp' | 'eliminated' | 'alive';
  /** Ronda en la que fueron eliminadas (para kind = eliminated / runnerUp). */
  round: RoundPlan | null;
  /** Posición compartida: desde–hasta (ambas incluidas). */
  from: number;
  to: number;
  pairIds: string[];
}

/**
 * Clasificación por ronda alcanzada. Las parejas eliminadas en la misma ronda
 * comparten posición (p. ej. 5.º–8.º): la eliminación directa no permite
 * desempatar más sin inventar criterios.
 */
export function standings(bracket: Bracket, pairs: Pair[]): StandingGroup[] {
  const progress = pairProgressMap(bracket, pairs);
  const groups: StandingGroup[] = [];
  const last = bracket.rounds.length - 1;
  const byNumber = (ids: string[]) => {
    const numberOf = new Map(pairs.map((p) => [p.id, p.number]));
    return ids.sort((x, y) => (numberOf.get(x) ?? 0) - (numberOf.get(y) ?? 0));
  };

  const champion = championOf(bracket);
  if (champion) groups.push({ kind: 'champion', round: bracket.rounds[last], from: 1, to: 1, pairIds: [champion] });

  const alive = [...progress].filter(([, p]) => p.status !== 'eliminated' && p.status !== 'champion').map(([id]) => id);
  if (alive.length) groups.push({ kind: 'alive', round: null, from: 0, to: 0, pairIds: byNumber(alive) });

  for (let r = last; r >= 0; r--) {
    const round = bracket.rounds[r];
    const losers = [...progress].filter(([, p]) => p.lostIn?.round === r).map(([id]) => id);
    if (!losers.length) continue;
    groups.push({
      kind: r === last ? 'runnerUp' : 'eliminated',
      round,
      from: round.target + 1,
      to: round.entrants,
      pairIds: byNumber(losers),
    });
  }
  return groups;
}

export interface ChampionshipStats {
  pairs: number;
  totalMatches: number;
  played: number;
  pending: number;
  /** Partidos con las dos parejas listas para jugar. */
  ready: number;
  /** Parejas que siguen en competición (incluida la campeona). */
  alive: number;
  eliminated: number;
  byes: number;
  /** Ronda en curso: la primera con partidos sin decidir. */
  currentRound: RoundPlan | null;
  champion: string | null;
}

export function championshipStats(bracket: Bracket | null, pairs: Pair[]): ChampionshipStats {
  if (!bracket) {
    return {
      pairs: pairs.length,
      totalMatches: Math.max(pairs.length - 1, 0),
      played: 0,
      pending: Math.max(pairs.length - 1, 0),
      ready: 0,
      alive: pairs.length,
      eliminated: 0,
      byes: 0,
      currentRound: null,
      champion: null,
    };
  }
  const played = bracket.matches.filter((m) => m.winner).length;
  const ready = bracket.matches.filter((m) => matchState(bracket, m) === 'ready').length;
  const pendingRound = bracket.matches
    .filter((m) => !m.winner)
    .reduce<number | null>((min, m) => (min === null || m.round < min ? m.round : min), null);
  return {
    pairs: pairs.length,
    totalMatches: bracket.matches.length,
    played,
    pending: bracket.matches.length - played,
    ready,
    alive: pairs.length - played,
    eliminated: played,
    byes: bracket.byes.length,
    currentRound: pendingRound === null ? null : bracket.rounds[pendingRound],
    champion: championOf(bracket),
  };
}
