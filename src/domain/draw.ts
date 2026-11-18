import { buildBracket } from './bracket';
import { pairLabel } from './pairs';
import { createCryptoRandom, fisherYates, newId, type RandomSource } from './random';
import { planRounds } from './rounds';
import type { Bracket, DrawRecord, DrawStrategy, Pair, RoundPlan } from './types';

/**
 * Una estrategia de sorteo decide dos cosas:
 * 1. El orden de las parejas.
 * 2. Qué posiciones de la primera ronda son partidos y cuáles pases directos.
 *
 * Con esa información `buildBracket` construye el cuadro fijo. Hoy existe la
 * estrategia «random» (la oficial). Cabezas de serie o sorteo manual se
 * añadirían como nuevas estrategias sin tocar el motor de eliminatorias.
 */
export interface DrawStrategyImpl {
  id: DrawStrategy;
  arrange(pairs: Pair[], rounds: RoundPlan[]): { order: string[]; layout: ('match' | 'bye')[] };
}

export function randomStrategy(random: RandomSource = createCryptoRandom()): DrawStrategyImpl {
  return {
    id: 'random',
    arrange(pairs, rounds) {
      const first = rounds[0];
      // 1) Orden de las parejas: Fisher-Yates sobre todas las inscritas.
      const order = fisherYates(
        pairs.map((p) => p.id),
        random,
      );
      // 2) Posición de los partidos y pases directos: también al azar, para
      //    que ningún número, nombre u orden de inscripción tenga ventaja.
      const units: ('match' | 'bye')[] = [
        ...Array<'match'>(first.matches).fill('match'),
        ...Array<'bye'>(first.byes).fill('bye'),
      ];
      const layout = fisherYates(units, random);
      return { order, layout };
    },
  };
}

export interface DrawResult {
  draw: DrawRecord;
  bracket: Bracket;
}

export function performDraw(
  pairs: Pair[],
  mainDrawSize: number,
  strategy: DrawStrategyImpl = randomStrategy(),
  now = new Date().toISOString(),
): DrawResult {
  const rounds = planRounds(pairs.length, mainDrawSize);
  const { order, layout } = strategy.arrange(pairs, rounds);
  const id = newId();
  const bracket = buildBracket(id, rounds, order, layout);
  const draw: DrawRecord = {
    id,
    createdAt: now,
    confirmedAt: null,
    strategy: strategy.id,
    algorithm: 'fisher-yates',
    randomSource: 'crypto.getRandomValues',
    config: { pairCount: pairs.length, mainDrawSize },
    participants: pairs.map((p) => ({ pairId: p.id, number: p.number, label: pairLabel(p) })),
    order,
    layout,
    rounds,
  };
  return { draw, bracket };
}
