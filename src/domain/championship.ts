import { correctWinner as correctInBracket, matchById, recordWinner } from './bracket';
import { performDraw, randomStrategy, type DrawStrategyImpl } from './draw';
import { cleanText, createPair, pairInputErrors, playersLabel, type PairInput } from './pairs';
import { newId } from './random';
import { validateSizes } from './rounds';
import { DomainError, SCHEMA_VERSION, type Championship, type HistoryEntry, type HistoryType, type Match } from './types';

/**
 * Operaciones sobre un campeonato. Todas son inmutables: devuelven un
 * campeonato nuevo con la entrada de historial correspondiente. La interfaz
 * solo llama a estas funciones y guarda el resultado.
 */

const HISTORY_LIMIT = 1000;

function stamp(ch: Championship, type: HistoryType, message: string, now: string): Championship {
  const entry: HistoryEntry = { at: now, type, message };
  return { ...ch, updatedAt: now, history: [entry, ...ch.history].slice(0, HISTORY_LIMIT) };
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface ChampionshipInput {
  name: string;
  date?: string;
  description?: string;
  mainDrawSize: number;
  pairs?: PairInput[];
}

export function championshipInputErrors(input: ChampionshipInput): string[] {
  const errors: string[] = [];
  if (!cleanText(input.name, 80)) errors.push('El campeonato necesita un nombre.');
  if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.push('La fecha no es válida.');
  if (![2, 4, 8, 16, 32].includes(input.mainDrawSize)) errors.push('El cuadro principal debe ser 2, 4, 8, 16 o 32.');
  return errors;
}

export function createChampionship(input: ChampionshipInput, now = new Date().toISOString()): Championship {
  const errors = championshipInputErrors(input);
  if (errors.length) throw new DomainError('invalid-championship', errors.join(' '));
  const base: Championship = {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    name: cleanText(input.name, 80),
    date: input.date || today(),
    description: cleanText(input.description, 500),
    competitionType: 'single-elimination',
    mainDrawSize: input.mainDrawSize,
    pairs: [],
    nextPairNumber: 1,
    drawStatus: 'none',
    draw: null,
    bracket: null,
    previousDraws: [],
    history: [],
    createdAt: now,
    updatedAt: now,
    revision: 0,
  };
  const created = stamp(base, 'created', `Campeonato creado: ${base.name}.`, now);
  return input.pairs?.length ? addPairs(created, input.pairs, now) : created;
}

/** ¿Se puede cambiar la lista de parejas o el cuadro principal? */
export function isLocked(ch: Championship): boolean {
  return ch.drawStatus === 'confirmed';
}

/** Descarta un sorteo sin confirmar cuando cambian los datos de los que depende. */
function dropPreview(ch: Championship, now: string): Championship {
  if (ch.drawStatus !== 'preview' || !ch.draw) return ch;
  const dropped = { ...ch, drawStatus: 'none' as const, previousDraws: [ch.draw, ...ch.previousDraws], draw: null, bracket: null };
  return stamp(dropped, 'draw-discarded', 'Sorteo sin confirmar descartado al cambiar los participantes o el cuadro.', now);
}

function assertUnlocked(ch: Championship): void {
  if (isLocked(ch)) {
    throw new DomainError('locked', 'El cuadro está confirmado. Para cambiar participantes o el tamaño del cuadro hay que hacer un nuevo sorteo.');
  }
}

export function updateDetails(
  ch: Championship,
  input: Partial<Pick<ChampionshipInput, 'name' | 'date' | 'description' | 'mainDrawSize'>>,
  now = new Date().toISOString(),
): Championship {
  const merged: ChampionshipInput = {
    name: input.name ?? ch.name,
    date: input.date ?? ch.date,
    description: input.description ?? ch.description,
    mainDrawSize: input.mainDrawSize ?? ch.mainDrawSize,
  };
  const errors = championshipInputErrors(merged);
  if (errors.length) throw new DomainError('invalid-championship', errors.join(' '));
  let next = ch;
  if (merged.mainDrawSize !== ch.mainDrawSize) {
    assertUnlocked(ch);
    next = dropPreview(next, now);
  }
  next = {
    ...next,
    name: cleanText(merged.name, 80),
    date: merged.date!,
    description: cleanText(merged.description, 500),
    mainDrawSize: merged.mainDrawSize,
  };
  return stamp(next, 'updated', 'Datos del campeonato actualizados.', now);
}

export function addPairs(ch: Championship, inputs: PairInput[], now = new Date().toISOString()): Championship {
  assertUnlocked(ch);
  if (!inputs.length) return ch;
  let number = ch.nextPairNumber;
  const created = inputs.map((input) => createPair(input, number++, now));
  let next: Championship = { ...dropPreview(ch, now), pairs: [...ch.pairs, ...created], nextPairNumber: number };
  const msg =
    created.length === 1
      ? `Pareja ${created[0].number} añadida: ${playersLabel(created[0])}.`
      : `${created.length} parejas añadidas (${created[0].number}–${created[created.length - 1].number}).`;
  next = stamp(next, 'pair-added', msg, now);
  return next;
}

/**
 * Editar nombres está permitido siempre: el cuadro guarda identificadores,
 * no nombres, así que cambiar un nombre no altera emparejamientos ni resultados.
 */
export function updatePair(ch: Championship, pairId: string, input: PairInput, now = new Date().toISOString()): Championship {
  const errors = pairInputErrors(input);
  if (errors.length) throw new DomainError('invalid-pair', errors.join(' '));
  const pair = ch.pairs.find((p) => p.id === pairId);
  if (!pair) throw new DomainError('pair-not-found', 'La pareja no existe.');
  const updated = { ...pair, name: cleanText(input.name), player1: cleanText(input.player1), player2: cleanText(input.player2) };
  const next = { ...ch, pairs: ch.pairs.map((p) => (p.id === pairId ? updated : p)) };
  return stamp(next, 'pair-updated', `Pareja ${pair.number} editada: ${playersLabel(updated)}.`, now);
}

export function removePair(ch: Championship, pairId: string, now = new Date().toISOString()): Championship {
  assertUnlocked(ch);
  const pair = ch.pairs.find((p) => p.id === pairId);
  if (!pair) throw new DomainError('pair-not-found', 'La pareja no existe.');
  const next = { ...dropPreview(ch, now), pairs: ch.pairs.filter((p) => p.id !== pairId) };
  return stamp(next, 'pair-removed', `Pareja ${pair.number} eliminada de la inscripción.`, now);
}

/**
 * Genera un sorteo nuevo (queda en «vista previa» hasta confirmarlo).
 * Si ya hay un cuadro confirmado, solo se rehace con `replaceConfirmed`
 * (la interfaz lo pide tras una advertencia explícita).
 */
export function generateDraw(
  ch: Championship,
  options: { strategy?: DrawStrategyImpl; replaceConfirmed?: boolean } = {},
  now = new Date().toISOString(),
): Championship {
  if (ch.drawStatus === 'confirmed' && !options.replaceConfirmed) {
    throw new DomainError('draw-confirmed', 'El cuadro ya está confirmado. Hay que confirmar expresamente un nuevo sorteo.');
  }
  validateSizes(ch.pairs.length, ch.mainDrawSize);
  const { draw, bracket } = performDraw(ch.pairs, ch.mainDrawSize, options.strategy ?? randomStrategy(), now);
  const previousDraws = ch.draw ? [ch.draw, ...ch.previousDraws] : ch.previousDraws;
  const wasConfirmed = ch.drawStatus === 'confirmed';
  const next: Championship = { ...ch, draw, bracket, drawStatus: 'preview', previousDraws };
  return stamp(
    next,
    'draw-generated',
    wasConfirmed
      ? 'Nuevo sorteo realizado. Se ha descartado el cuadro anterior y sus resultados.'
      : `Sorteo realizado con ${ch.pairs.length} parejas (cuadro principal de ${ch.mainDrawSize}).`,
    now,
  );
}

export function confirmDraw(ch: Championship, now = new Date().toISOString()): Championship {
  if (ch.drawStatus !== 'preview' || !ch.draw || !ch.bracket) {
    throw new DomainError('no-preview', 'No hay ningún sorteo pendiente de confirmar.');
  }
  const next: Championship = { ...ch, drawStatus: 'confirmed', draw: { ...ch.draw, confirmedAt: now } };
  return stamp(next, 'draw-confirmed', 'Cuadro confirmado. Ya se pueden registrar ganadoras.', now);
}

export function discardDraft(ch: Championship, now = new Date().toISOString()): Championship {
  if (ch.drawStatus !== 'preview') throw new DomainError('no-preview', 'No hay ningún sorteo pendiente de confirmar.');
  return dropPreview(ch, now);
}

function describeWinner(ch: Championship, pairId: string | null): string {
  const pair = ch.pairs.find((p) => p.id === pairId);
  return pair ? `pareja ${pair.number} (${playersLabel(pair)})` : 'sin ganadora';
}

function requireConfirmedBracket(ch: Championship) {
  if (ch.drawStatus !== 'confirmed' || !ch.bracket) {
    throw new DomainError('not-confirmed', 'Primero hay que confirmar el cuadro.');
  }
  return ch.bracket;
}

export function setWinner(ch: Championship, matchId: string, pairId: string, now = new Date().toISOString()): Championship {
  const bracket = recordWinner(requireConfirmedBracket(ch), matchId, pairId, now);
  const match = matchById(bracket, matchId);
  const isFinal = match.round === bracket.rounds.length - 1;
  const msg = isFinal
    ? `Final: campeona la ${describeWinner(ch, pairId)}.`
    : `Partido ${match.number}: gana la ${describeWinner(ch, pairId)}.`;
  return stamp({ ...ch, bracket }, 'winner-set', msg, now);
}

export function correctMatch(
  ch: Championship,
  matchId: string,
  pairId: string | null,
  now = new Date().toISOString(),
): { championship: Championship; invalidated: Match[] } {
  const { bracket, invalidated } = correctInBracket(requireConfirmedBracket(ch), matchId, pairId, now);
  if (bracket === ch.bracket) return { championship: ch, invalidated };
  const match = matchById(bracket, matchId);
  const extra = invalidated.length ? ` Se anulan ${invalidated.length} partido(s) posteriores de esa rama: ${invalidated.map((m) => m.number).join(', ')}.` : '';
  const msg =
    pairId === null
      ? `Partido ${match.number}: resultado anulado.${extra}`
      : `Partido ${match.number}: resultado corregido, gana la ${describeWinner(ch, pairId)}.${extra}`;
  return { championship: stamp({ ...ch, bracket }, pairId === null ? 'winner-cleared' : 'winner-corrected', msg, now), invalidated };
}

/** Copia independiente con nuevo identificador (para importar duplicados). */
export function cloneAsNew(ch: Championship, now = new Date().toISOString()): Championship {
  return stamp({ ...ch, id: newId(), name: `${ch.name} (copia)`, revision: 0, createdAt: now }, 'imported', 'Importado como copia.', now);
}
