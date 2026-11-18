import { DomainError, MAIN_DRAW_SIZES, MAX_PAIRS, type RoundPlan } from './types';

export function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && (n & (n - 1)) === 0;
}

/** Mayor potencia de 2 estrictamente menor que n (n ≥ 2). */
export function largestPowerOfTwoBelow(n: number): number {
  let p = 1;
  while (p * 2 < n) p *= 2;
  return p;
}

/** Mayor potencia de 2 menor o igual que n. */
export function largestPowerOfTwoAtMost(n: number): number {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

/**
 * Cuadro principal recomendado: el mayor tamaño admitido que no supera
 * el número de parejas.
 */
export function recommendMainDrawSize(pairCount: number): number | null {
  if (pairCount < 2) return null;
  return MAIN_DRAW_SIZES.find((size) => size <= pairCount) ?? null;
}

function makeRound(index: number, kind: RoundPlan['kind'], entrants: number, target: number, prelimNumber: number): RoundPlan {
  const matches = entrants - target;
  const byes = 2 * target - entrants;
  // Invariantes de la regla N ≤ P ≤ 2N.
  if (matches < 1 || byes < 0 || target < 1) {
    throw new DomainError('invalid-round', `Ronda imposible: ${entrants} → ${target}`);
  }
  return { index, kind, entrants, target, matches, byes, prelimNumber };
}

/**
 * Calcula todas las rondas para reducir P parejas a un campeón empezando
 * el cuadro principal en N.
 *
 * - Si P > N, la primera fase previa lleva P a la mayor potencia de 2 menor
 *   que P (con pases directos si P no es potencia de 2). Después se añaden
 *   fases previas completas hasta llegar a N. Cada transición cumple
 *   target ≤ entrants ≤ 2·target.
 * - Desde N se juegan las rondas del cuadro principal hasta la final.
 */
export function planRounds(pairCount: number, mainDrawSize: number): RoundPlan[] {
  validateSizes(pairCount, mainDrawSize);
  const rounds: RoundPlan[] = [];
  let prelim = 0;
  if (pairCount > mainDrawSize) {
    let current = pairCount;
    let target = largestPowerOfTwoBelow(pairCount);
    rounds.push(makeRound(rounds.length, 'prelim', current, target, ++prelim));
    current = target;
    while (current > mainDrawSize) {
      target = current / 2;
      rounds.push(makeRound(rounds.length, 'prelim', current, target, ++prelim));
      current = target;
    }
  }
  for (let current = mainDrawSize; current >= 2; current /= 2) {
    rounds.push(makeRound(rounds.length, 'main', current, current / 2, 0));
  }
  return rounds;
}

export function validateSizes(pairCount: number, mainDrawSize: number): void {
  if (!Number.isInteger(pairCount) || pairCount < 2) {
    throw new DomainError('too-few-pairs', 'Se necesitan al menos 2 parejas.');
  }
  if (pairCount > MAX_PAIRS) {
    throw new DomainError('too-many-pairs', `El máximo es de ${MAX_PAIRS} parejas.`);
  }
  if (!isPowerOfTwo(mainDrawSize) || mainDrawSize < 2) {
    throw new DomainError('invalid-main-draw', 'El cuadro principal debe ser 2, 4, 8, 16 o 32.');
  }
  if (pairCount < mainDrawSize) {
    throw new DomainError(
      'not-enough-pairs',
      `Hay ${pairCount} parejas y el cuadro elegido necesita ${mainDrawSize}. Elige un cuadro menor o añade parejas.`,
    );
  }
}

/** Total de partidos de un campeonato de eliminación directa: P − 1. */
export function totalMatches(rounds: RoundPlan[]): number {
  return rounds.reduce((sum, r) => sum + r.matches, 0);
}
