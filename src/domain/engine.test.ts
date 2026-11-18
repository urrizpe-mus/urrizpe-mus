import { describe, expect, it } from 'vitest';
import {
  bracketIntegrityErrors,
  championOf,
  correctWinner,
  dependentDecidedMatches,
  loserOf,
  matchPairs,
  matchState,
  parentOf,
  recordWinner,
  winnerOf,
} from './bracket';
import { performDraw, randomStrategy } from './draw';
import { createCryptoRandom, fisherYates, type RandomSource } from './random';
import { planRounds, recommendMainDrawSize, totalMatches } from './rounds';
import { championshipStats, pairProgressMap, standings } from './standings';
import { DomainError, type Bracket, type Pair } from './types';

function makePairs(n: number): Pair[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    number: i + 1,
    name: '',
    player1: `Jugador ${2 * i + 1}`,
    player2: `Jugador ${2 * i + 2}`,
    createdAt: '2026-01-01T00:00:00.000Z',
  }));
}

/** Cuadro principal habitual para cada cantidad (el recomendado). */
function mainFor(n: number): number {
  return recommendMainDrawSize(n)!;
}

/** Juega todos los partidos listos, ronda a ronda, eligiendo una ganadora. */
function playAll(bracket: Bracket, pick: (a: string, b: string) => string = (a) => a): Bracket {
  let b = bracket;
  for (let r = 0; r < b.rounds.length; r++) {
    for (const m of b.matches.filter((x) => x.round === r)) {
      const [x, y] = matchPairs(b, m);
      expect(x && y, `partido ${m.number} sin parejas`).toBeTruthy();
      b = recordWinner(b, m.id, pick(x!, y!));
    }
  }
  return b;
}

const REQUIRED_COUNTS = [2, 3, 4, 5, 8, 16, 17, 23, 32, 33, 50, 64, 100, 128];

describe('plan de rondas (regla N ≤ P ≤ 2N)', () => {
  it('50 parejas con cuadro de 32: 18 previos, 36 juegan, 14 exentas', () => {
    const rounds = planRounds(50, 32);
    expect(rounds[0]).toMatchObject({ kind: 'prelim', entrants: 50, target: 32, matches: 18, byes: 14 });
    expect(rounds[0].matches * 2).toBe(36);
    expect(rounds.slice(1).map((r) => r.entrants)).toEqual([32, 16, 8, 4, 2]);
    expect(totalMatches(rounds)).toBe(49);
  });

  it('23 parejas con cuadro de 16: 7 previos, 14 juegan, 9 exentas', () => {
    const rounds = planRounds(23, 16);
    expect(rounds[0]).toMatchObject({ entrants: 23, target: 16, matches: 7, byes: 9 });
    expect(rounds[0].matches + rounds[0].byes).toBe(16);
    expect(rounds.slice(1).map((r) => r.entrants)).toEqual([16, 8, 4, 2]);
  });

  it('16 parejas empezando en octavos: sin previa, 8 partidos', () => {
    const rounds = planRounds(16, 16);
    expect(rounds[0]).toMatchObject({ kind: 'main', entrants: 16, matches: 8, byes: 0 });
    expect(rounds.every((r) => r.kind === 'main')).toBe(true);
  });

  it('100 parejas con cuadro de 32: 100 → 64 → 32 y después dieciseisavos', () => {
    const rounds = planRounds(100, 32);
    expect(rounds.map((r) => [r.kind, r.entrants, r.target])).toEqual([
      ['prelim', 100, 64],
      ['prelim', 64, 32],
      ['main', 32, 16],
      ['main', 16, 8],
      ['main', 8, 4],
      ['main', 4, 2],
      ['main', 2, 1],
    ]);
    expect(rounds[0]).toMatchObject({ matches: 36, byes: 28 });
  });

  it('cada transición cumple target ≤ entrants ≤ 2·target para muchas combinaciones', () => {
    for (let p = 2; p <= 256; p++) {
      for (const n of [2, 4, 8, 16, 32]) {
        if (p < n) {
          expect(() => planRounds(p, n)).toThrowError(DomainError);
          continue;
        }
        const rounds = planRounds(p, n);
        expect(rounds[0].entrants).toBe(p);
        expect(totalMatches(rounds)).toBe(p - 1);
        rounds.forEach((r, i) => {
          expect(r.target).toBeLessThanOrEqual(r.entrants);
          expect(r.entrants).toBeLessThanOrEqual(2 * r.target);
          expect(r.matches).toBe(r.entrants - r.target);
          expect(r.byes).toBe(2 * r.target - r.entrants);
          if (i > 0) expect(r.entrants).toBe(rounds[i - 1].target);
          if (i > 0) expect(r.byes).toBe(0); // solo hay pases directos en la primera ronda
        });
        expect(rounds.find((r) => r.kind === 'main')!.entrants).toBe(n);
        expect(rounds[rounds.length - 1]).toMatchObject({ entrants: 2, target: 1 });
      }
    }
  });

  it('avisa si hay menos parejas que el cuadro elegido y no inventa participantes', () => {
    expect(() => planRounds(12, 16)).toThrowError(/16/);
    expect(() => planRounds(1, 2)).toThrowError(DomainError);
  });

  it('recomienda el mayor cuadro que no supera las parejas', () => {
    expect(recommendMainDrawSize(50)).toBe(32);
    expect(recommendMainDrawSize(23)).toBe(16);
    expect(recommendMainDrawSize(5)).toBe(4);
    expect(recommendMainDrawSize(3)).toBe(2);
    expect(recommendMainDrawSize(1)).toBeNull();
  });
});

describe.each(REQUIRED_COUNTS)('campeonato completo con %i parejas', (n) => {
  const pairs = makePairs(n);
  const ids = pairs.map((p) => p.id);
  const { bracket, draw } = performDraw(pairs, mainFor(n));

  it('1-7: todas las parejas aparecen una sola vez; previas, exentos y rondas correctos', () => {
    expect(bracketIntegrityErrors(bracket, ids)).toEqual([]);
    const first = bracket.rounds[0];
    const inFirstRound = [
      ...bracket.byes.map((b) => b.pairId),
      ...bracket.matches.filter((m) => m.round === 0).flatMap((m) => matchPairs(bracket, m)),
    ];
    expect(inFirstRound).toHaveLength(n); // ninguna desaparece
    expect(new Set(inFirstRound).size).toBe(n); // ninguna duplicada
    expect(new Set(inFirstRound)).toEqual(new Set(ids)); // todas las inscritas
    expect(bracket.byes).toHaveLength(first.byes);
    expect(bracket.matches.filter((m) => m.round === 0)).toHaveLength(first.matches);
    expect(first.matches).toBe(n - first.target);
    expect(draw.order).toHaveLength(n);
    expect(draw.layout).toHaveLength(first.target);
  });

  it('8-11: cada partido elimina una pareja, ganadoras avanzan al partido correcto, un único campeón', () => {
    const done = playAll(bracket, (a, b) => (a < b ? a : b));
    // Cada ronda: participantes únicos y exactamente los que debe haber.
    done.rounds.forEach((round, r) => {
      const players = done.matches.filter((m) => m.round === r).flatMap((m) => matchPairs(done, m));
      const viaBye = r === 0 ? done.byes.length : 0;
      expect(players.length + viaBye).toBe(round.entrants);
      expect(new Set(players).size).toBe(players.length); // una pareja, un partido por ronda
    });
    const losers = done.matches.map((m) => loserOf(done, m));
    expect(new Set(losers).size).toBe(n - 1); // cada partido elimina a una pareja distinta
    for (const m of done.matches) {
      const parent = parentOf(done, m.id);
      if (!parent) continue;
      const [a, b] = matchPairs(done, parent.match);
      expect(parent.side === 'A' ? a : b).toBe(winnerOf(done, m)); // avanza al lado correcto
    }
    const champion = championOf(done);
    expect(champion).not.toBeNull();
    expect(losers).not.toContain(champion);
    expect(done.matches).toHaveLength(n - 1); // P − 1 partidos
    const progress = pairProgressMap(done, pairs);
    expect([...progress.values()].filter((p) => p.status === 'champion')).toHaveLength(1);
    expect([...progress.values()].filter((p) => p.status === 'eliminated')).toHaveLength(n - 1);
  });

  it('las exentas no suman victorias por partidos no disputados', () => {
    const progress = pairProgressMap(bracket, pairs);
    for (const b of bracket.byes) {
      expect(progress.get(b.pairId)).toMatchObject({ hadBye: true, wins: 0, status: 'bye' });
    }
  });

  it('la clasificación agrupa por ronda y reparte exactamente P posiciones', () => {
    const done = playAll(bracket);
    const groups = standings(done, pairs);
    expect(groups[0]).toMatchObject({ kind: 'champion', from: 1, to: 1 });
    const total = groups.reduce((s, g) => s + g.pairIds.length, 0);
    expect(total).toBe(n);
    for (const g of groups) expect(g.to - g.from + 1).toBe(g.pairIds.length);
    expect(championshipStats(done, pairs)).toMatchObject({ played: n - 1, pending: 0, totalMatches: n - 1 });
  });
});

describe('registro y corrección de ganadoras', () => {
  const pairs = makePairs(16);
  const { bracket } = performDraw(pairs, 16);
  const firstRound = bracket.matches.filter((m) => m.round === 0);

  it('12: no admite dos ganadoras diferentes sin corregir', () => {
    const m = firstRound[0];
    const [a, b] = matchPairs(bracket, m);
    const once = recordWinner(bracket, m.id, a!);
    expect(() => recordWinner(once, m.id, b!)).toThrowError(/Corregir/);
    expect(() => recordWinner(once, m.id, a!)).toThrowError(DomainError);
  });

  it('rechaza ganadoras que no juegan el partido y partidos sin rival', () => {
    const m = firstRound[0];
    const outsider = matchPairs(bracket, firstRound[1])[0]!;
    expect(() => recordWinner(bracket, m.id, outsider)).toThrowError(/no juega/);
    const quarter = bracket.matches.find((x) => x.round === 1)!;
    expect(matchState(bracket, quarter)).toBe('waiting');
    expect(() => recordWinner(bracket, quarter.id, 'p1')).toThrowError(/dos parejas/);
  });

  it('13: corregir invalida solo la rama afectada y conserva las demás', () => {
    const done = playAll(bracket);
    const target = firstRound[0]; // octavos, rama izquierda
    const before = new Map(done.matches.map((m) => [m.id, m.winner]));
    const dependents = dependentDecidedMatches(done, target.id);
    expect(dependents.map((m) => m.round)).toEqual([1, 2, 3]); // cuartos, semis, final
    const loser = loserOf(done, done.matches.find((m) => m.id === target.id)!)!;
    expect(matchPairs(done, target)).toContain(loser);
    const { bracket: fixed, invalidated } = correctWinner(done, target.id, loser);
    expect(invalidated.map((m) => m.id)).toEqual(dependents.map((m) => m.id));
    expect(winnerOf(fixed, fixed.matches.find((m) => m.id === target.id)!)).toBe(loser);
    const touched = new Set([target.id, ...dependents.map((m) => m.id)]);
    for (const m of fixed.matches) {
      if (touched.has(m.id)) continue;
      expect(m.winner).toBe(before.get(m.id)); // ramas independientes intactas
    }
    for (const d of dependents) expect(fixed.matches.find((m) => m.id === d.id)!.winner).toBeNull();
    // La pareja corregida ocupa ahora su lugar en cuartos.
    const parent = parentOf(fixed, target.id)!;
    const [pa, pb] = matchPairs(fixed, parent.match);
    expect(parent.side === 'A' ? pa : pb).toBe(loser);
    expect(championOf(fixed)).toBeNull();
    expect(bracketIntegrityErrors(fixed, pairs.map((p) => p.id))).toEqual([]);
  });

  it('corregir un partido cuya siguiente ronda está pendiente no anula nada más', () => {
    const m = firstRound[3];
    const [a, b] = matchPairs(bracket, m);
    const one = recordWinner(bracket, m.id, a!);
    const { bracket: fixed, invalidated } = correctWinner(one, m.id, b!);
    expect(invalidated).toEqual([]);
    expect(winnerOf(fixed, fixed.matches.find((x) => x.id === m.id)!)).toBe(b);
  });

  it('se puede anular un resultado (vuelve a pendiente)', () => {
    const m = firstRound[2];
    const [a] = matchPairs(bracket, m);
    const one = recordWinner(bracket, m.id, a!);
    const { bracket: cleared } = correctWinner(one, m.id, null);
    expect(cleared.matches.find((x) => x.id === m.id)!.winner).toBeNull();
  });
});

describe('sorteo aleatorio', () => {
  it('usa crypto.getRandomValues y produce enteros dentro del rango', () => {
    let calls = 0;
    const fake = {
      getRandomValues<T extends ArrayBufferView>(arr: T): T {
        calls++;
        (arr as unknown as Uint32Array)[0] = 0xffffffff; // fuerza rechazo y luego…
        if (calls > 1) (arr as unknown as Uint32Array)[0] = 7;
        return arr;
      },
    } as unknown as Crypto;
    const rnd = createCryptoRandom(fake);
    expect(rnd.int(5)).toBe(2); // 7 % 5, tras rechazar el valor sesgado
    expect(calls).toBe(2);
  });

  it('Fisher-Yates es una permutación y no modifica la entrada', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const copy = items.slice();
    const out = fisherYates(items, createCryptoRandom());
    expect(items).toEqual(copy);
    expect(out.slice().sort((a, b) => a - b)).toEqual(items);
  });

  it('Fisher-Yates reparte las 24 permutaciones de 4 elementos de forma uniforme', () => {
    const rnd = createCryptoRandom();
    const counts = new Map<string, number>();
    const N = 48000;
    for (let i = 0; i < N; i++) {
      const key = fisherYates(['a', 'b', 'c', 'd'], rnd).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(24);
    const expected = N / 24;
    const chi2 = [...counts.values()].reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
    expect(chi2).toBeLessThan(60); // 23 g.l.: p ≈ 0.00004; un fallo indicaría sesgo real
  });

  it('los pases directos no favorecen a los primeros ni a los últimos números', () => {
    const pairs = makePairs(23);
    const byeCount = new Map<string, number>();
    const draws = 3000;
    for (let i = 0; i < draws; i++) {
      for (const b of performDraw(pairs, 16, randomStrategy()).bracket.byes) {
        byeCount.set(b.pairId, (byeCount.get(b.pairId) ?? 0) + 1);
      }
    }
    // Cada pareja debería quedar exenta 9/23 de las veces (≈ 1174).
    const expected = (draws * 9) / 23;
    for (const p of pairs) {
      const c = byeCount.get(p.id) ?? 0;
      expect(Math.abs(c - expected)).toBeLessThan(expected * 0.15);
    }
  });

  it('la estrategia es intercambiable (preparado para cabezas de serie o sorteo manual)', () => {
    const fixed: RandomSource = { int: () => 0 };
    const pairs = makePairs(5);
    const a = performDraw(pairs, 4, randomStrategy(fixed));
    const b = performDraw(pairs, 4, randomStrategy(fixed));
    expect(a.draw.order).toEqual(b.draw.order);
    expect(a.draw.layout).toEqual(b.draw.layout);
    expect(a.draw).toMatchObject({ algorithm: 'fisher-yates', randomSource: 'crypto.getRandomValues', strategy: 'random' });
  });
});
