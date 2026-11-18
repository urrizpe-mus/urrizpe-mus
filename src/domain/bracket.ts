import { newId } from './random';
import { totalMatches } from './rounds';
import { DomainError, type Bracket, type Match, type RoundPlan, type Side } from './types';

/**
 * Construye el cuadro fijo a partir de:
 * - `order`: parejas en el orden resultante del sorteo.
 * - `layout`: para cada posición de la primera ronda, si hay partido o pase directo.
 *
 * La primera ronda tiene `rounds[0].target` unidades. Cada unidad es un
 * partido (consume dos parejas) o un pase directo (consume una). La unidad
 * en la posición p alimenta el lado (p % 2) del partido floor(p / 2) de la
 * ronda siguiente. Así el cuadro es un árbol binario completo y cada pareja
 * sabe desde el principio hacia dónde avanza.
 */
export function buildBracket(drawId: string, rounds: RoundPlan[], order: string[], layout: ('match' | 'bye')[]): Bracket {
  const first = rounds[0];
  if (!first) throw new DomainError('invalid-plan', 'No hay rondas.');
  if (order.length !== first.entrants) throw new DomainError('invalid-order', 'El número de parejas no coincide con el plan.');
  if (new Set(order).size !== order.length) throw new DomainError('duplicate-pair', 'Hay parejas repetidas en el sorteo.');
  if (layout.length !== first.target) throw new DomainError('invalid-layout', 'La distribución no coincide con la primera ronda.');
  const layoutMatches = layout.filter((u) => u === 'match').length;
  if (layoutMatches !== first.matches || layout.length - layoutMatches !== first.byes) {
    throw new DomainError('invalid-layout', 'La distribución de partidos y pases directos no es correcta.');
  }

  const matches: Match[] = [];
  const byes: Bracket['byes'] = [];
  let cursor = 0;
  let number = 1;
  // Fuente de cada unidad/partido de la ronda anterior, por posición.
  let previous: Side[] = [];

  layout.forEach((unit, position) => {
    if (unit === 'match') {
      const match: Match = {
        id: newId(),
        number: number++,
        round: 0,
        position,
        sideA: { from: 'pair', pairId: order[cursor++] },
        sideB: { from: 'pair', pairId: order[cursor++] },
        winner: null,
        decidedAt: null,
      };
      matches.push(match);
      previous.push({ from: 'match', matchId: match.id });
    } else {
      const pairId = order[cursor++];
      byes.push({ pairId, position });
      previous.push({ from: 'bye', pairId });
    }
  });

  for (let r = 1; r < rounds.length; r++) {
    const current: Side[] = [];
    for (let j = 0; j < rounds[r].matches; j++) {
      const match: Match = {
        id: newId(),
        number: number++,
        round: r,
        position: j,
        sideA: previous[2 * j],
        sideB: previous[2 * j + 1],
        winner: null,
        decidedAt: null,
      };
      matches.push(match);
      current.push({ from: 'match', matchId: match.id });
    }
    previous = current;
  }

  const bracket: Bracket = { drawId, rounds, matches, byes };
  assertBracketIntegrity(bracket, order);
  return bracket;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export function matchById(bracket: Bracket, matchId: string): Match {
  const match = bracket.matches.find((m) => m.id === matchId);
  if (!match) throw new DomainError('match-not-found', 'El partido no existe.');
  return match;
}

/** Pareja ganadora de un partido o null si está pendiente. */
export function winnerOf(bracket: Bracket, match: Match): string | null {
  if (!match.winner) return null;
  return resolveSide(bracket, match.winner === 'A' ? match.sideA : match.sideB);
}

/** Pareja perdedora de un partido o null si está pendiente. */
export function loserOf(bracket: Bracket, match: Match): string | null {
  if (!match.winner) return null;
  return resolveSide(bracket, match.winner === 'A' ? match.sideB : match.sideA);
}

/** Pareja que ocupa un lado (null si aún depende de un partido sin decidir). */
export function resolveSide(bracket: Bracket, side: Side): string | null {
  if (side.from === 'pair' || side.from === 'bye') return side.pairId;
  return winnerOf(bracket, matchById(bracket, side.matchId));
}

export function matchPairs(bracket: Bracket, match: Match): [string | null, string | null] {
  return [resolveSide(bracket, match.sideA), resolveSide(bracket, match.sideB)];
}

/** Partido al que avanza el ganador (null en la final). */
export function parentOf(bracket: Bracket, matchId: string): { match: Match; side: 'A' | 'B' } | null {
  for (const m of bracket.matches) {
    if (m.sideA.from === 'match' && m.sideA.matchId === matchId) return { match: m, side: 'A' };
    if (m.sideB.from === 'match' && m.sideB.matchId === matchId) return { match: m, side: 'B' };
  }
  return null;
}

export function finalMatch(bracket: Bracket): Match {
  const last = bracket.rounds.length - 1;
  const final = bracket.matches.find((m) => m.round === last);
  if (!final) throw new DomainError('no-final', 'El cuadro no tiene final.');
  return final;
}

export function championOf(bracket: Bracket): string | null {
  return winnerOf(bracket, finalMatch(bracket));
}

export type MatchState = 'waiting' | 'ready' | 'finished';

/** waiting: falta algún rival · ready: se puede jugar · finished: tiene ganadora. */
export function matchState(bracket: Bracket, match: Match): MatchState {
  if (match.winner) return 'finished';
  const [a, b] = matchPairs(bracket, match);
  return a && b ? 'ready' : 'waiting';
}

/**
 * Partidos ya decididos que dependen del resultado de `matchId`: se recorre
 * hacia arriba mientras los partidos tengan ganadora. El primer partido
 * pendiente se actualiza solo (sus lados se calculan a partir de los
 * resultados), así que no hace falta tocarlo.
 */
export function dependentDecidedMatches(bracket: Bracket, matchId: string): Match[] {
  const result: Match[] = [];
  let parent = parentOf(bracket, matchId);
  while (parent && parent.match.winner) {
    result.push(parent.match);
    parent = parentOf(bracket, parent.match.id);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Operaciones (inmutables)
// ---------------------------------------------------------------------------

function replaceMatches(bracket: Bracket, changes: Map<string, Partial<Match>>): Bracket {
  return {
    ...bracket,
    matches: bracket.matches.map((m) => (changes.has(m.id) ? { ...m, ...changes.get(m.id) } : m)),
  };
}

/**
 * Registra la pareja ganadora de un partido pendiente.
 * Si el partido ya tiene ganadora hay que usar `correctWinner`.
 */
export function recordWinner(bracket: Bracket, matchId: string, winnerPairId: string, at = new Date().toISOString()): Bracket {
  const match = matchById(bracket, matchId);
  if (match.winner) {
    throw new DomainError('already-decided', 'Este partido ya tiene ganadora. Usa «Corregir» para cambiarla.');
  }
  const [a, b] = matchPairs(bracket, match);
  if (!a || !b) throw new DomainError('not-ready', 'Este partido todavía no tiene las dos parejas.');
  const side = winnerPairId === a ? 'A' : winnerPairId === b ? 'B' : null;
  if (!side) throw new DomainError('not-in-match', 'Esa pareja no juega este partido.');
  return replaceMatches(bracket, new Map([[matchId, { winner: side, decidedAt: at }]]));
}

/**
 * Cambia la ganadora de un partido ya decidido (o la borra si
 * `newWinnerPairId` es null). Invalida solo los partidos posteriores de la
 * misma rama que ya estaban decididos; el resto del cuadro no cambia.
 */
export function correctWinner(
  bracket: Bracket,
  matchId: string,
  newWinnerPairId: string | null,
  at = new Date().toISOString(),
): { bracket: Bracket; invalidated: Match[] } {
  const match = matchById(bracket, matchId);
  if (!match.winner) throw new DomainError('not-decided', 'Este partido aún no tiene ganadora.');
  const [a, b] = matchPairs(bracket, match);
  let newSide: 'A' | 'B' | null = null;
  if (newWinnerPairId !== null) {
    newSide = newWinnerPairId === a ? 'A' : newWinnerPairId === b ? 'B' : null;
    if (!newSide) throw new DomainError('not-in-match', 'Esa pareja no juega este partido.');
    if (newSide === match.winner) return { bracket, invalidated: [] };
  }
  const invalidated = dependentDecidedMatches(bracket, matchId);
  const changes = new Map<string, Partial<Match>>();
  changes.set(matchId, { winner: newSide, decidedAt: newSide ? at : null });
  for (const m of invalidated) changes.set(m.id, { winner: null, decidedAt: null });
  return { bracket: replaceMatches(bracket, changes), invalidated };
}

// ---------------------------------------------------------------------------
// Integridad
// ---------------------------------------------------------------------------

/**
 * Comprueba la coherencia estructural del cuadro. Se usa al generarlo, al
 * importar copias de seguridad y en las pruebas. Devuelve la lista de errores.
 */
export function bracketIntegrityErrors(bracket: Bracket, pairIds: string[]): string[] {
  const errors: string[] = [];
  const { rounds, matches, byes } = bracket;
  if (!rounds.length) return ['El cuadro no tiene rondas.'];
  const P = rounds[0].entrants;
  if (pairIds.length !== P) errors.push(`El cuadro es para ${P} parejas y hay ${pairIds.length}.`);
  if (matches.length !== P - 1) errors.push(`Debe haber ${P - 1} partidos y hay ${matches.length}.`);
  if (totalMatches(rounds) !== P - 1) errors.push('El plan de rondas no suma P − 1 partidos.');

  // Cada pareja aparece exactamente una vez en la primera ronda.
  const seen = new Map<string, number>();
  const count = (id: string) => seen.set(id, (seen.get(id) ?? 0) + 1);
  byes.forEach((b) => count(b.pairId));
  matches.forEach((m) => {
    if (m.sideA.from === 'pair') count(m.sideA.pairId);
    if (m.sideB.from === 'pair') count(m.sideB.pairId);
  });
  for (const id of pairIds) {
    const n = seen.get(id) ?? 0;
    if (n !== 1) errors.push(`La pareja ${id} aparece ${n} veces en la primera ronda.`);
  }
  for (const id of seen.keys()) if (!pairIds.includes(id)) errors.push(`Pareja desconocida en el cuadro: ${id}.`);

  // Número de partidos y pases directos por ronda.
  rounds.forEach((r, i) => {
    const inRound = matches.filter((m) => m.round === i).length;
    if (inRound !== r.matches) errors.push(`La ronda ${i + 1} debe tener ${r.matches} partidos y tiene ${inRound}.`);
    if (r.entrants !== r.matches * 2 + r.byes) errors.push(`La ronda ${i + 1} no cuadra.`);
    if (i > 0 && r.entrants !== rounds[i - 1].target) errors.push(`La ronda ${i + 1} no recibe a todas las clasificadas.`);
  });
  if (byes.length !== rounds[0].byes) errors.push('El número de pases directos no es correcto.');

  // Cada partido alimenta exactamente un lado de otro (salvo la final).
  const ids = new Set(matches.map((m) => m.id));
  const fed = new Map<string, number>();
  matches.forEach((m) =>
    [m.sideA, m.sideB].forEach((s) => {
      if (s.from === 'match') {
        if (!ids.has(s.matchId)) errors.push(`Referencia a un partido inexistente en el partido ${m.number}.`);
        fed.set(s.matchId, (fed.get(s.matchId) ?? 0) + 1);
        const source = matches.find((x) => x.id === s.matchId);
        if (source && source.round !== m.round - 1) errors.push(`El partido ${m.number} recibe de una ronda incorrecta.`);
      } else if (m.round !== 0 && s.from === 'pair') {
        errors.push(`El partido ${m.number} tiene una pareja colocada fuera de la primera ronda.`);
      } else if (s.from === 'bye' && m.round !== 1) {
        errors.push(`El partido ${m.number} recibe un pase directo en una ronda incorrecta.`);
      }
    }),
  );
  const lastRound = rounds.length - 1;
  matches.forEach((m) => {
    const n = fed.get(m.id) ?? 0;
    const expected = m.round === lastRound ? 0 : 1;
    if (n !== expected) errors.push(`El ganador del partido ${m.number} avanza a ${n} partidos.`);
  });

  // Los resultados solo existen si ambos lados están definidos.
  if (errors.length) return errors;
  matches.forEach((m) => {
    if (m.winner && m.winner !== 'A' && m.winner !== 'B') errors.push(`Resultado no válido en el partido ${m.number}.`);
    else if (m.winner) {
      const [a, b] = matchPairs(bracket, m);
      if (!a || !b) errors.push(`El partido ${m.number} tiene ganadora sin tener las dos parejas.`);
    }
  });
  return errors;
}

export function assertBracketIntegrity(bracket: Bracket, pairIds: string[]): void {
  const errors = bracketIntegrityErrors(bracket, pairIds);
  if (errors.length) throw new DomainError('integrity', errors.join(' '));
}
