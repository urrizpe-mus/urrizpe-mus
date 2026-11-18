import { newId } from './random';
import { DomainError, MAX_PAIRS, type Pair } from './types';

export const NAME_MAX = 60;

export interface PairInput {
  name?: string;
  player1: string;
  player2: string;
}

/** Limpia espacios y caracteres de control. */
export function cleanText(value: unknown, max = NAME_MAX): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** «Lloyd y HB» */
export function playersLabel(pair: Pick<Pair, 'player1' | 'player2'>): string {
  return `${pair.player1} y ${pair.player2}`;
}

/** Nombre corto para listados: nombre de pareja o integrantes. */
export function pairLabel(pair: Pair): string {
  return pair.name ? pair.name : playersLabel(pair);
}

export function pairInputErrors(input: PairInput): string[] {
  const errors: string[] = [];
  if (!cleanText(input.player1)) errors.push('Falta el primer integrante.');
  if (!cleanText(input.player2)) errors.push('Falta el segundo integrante.');
  return errors;
}

export function createPair(input: PairInput, number: number, now = new Date().toISOString()): Pair {
  const errors = pairInputErrors(input);
  if (errors.length) throw new DomainError('invalid-pair', errors.join(' '));
  return {
    id: newId(),
    number,
    name: cleanText(input.name),
    player1: cleanText(input.player1),
    player2: cleanText(input.player2),
    createdAt: now,
  };
}

/** Problemas que impiden hacer el sorteo. */
export function pairListErrors(pairs: Pair[]): string[] {
  const errors: string[] = [];
  if (pairs.length < 2) errors.push('Se necesitan al menos 2 parejas.');
  if (pairs.length > MAX_PAIRS) errors.push(`El máximo es de ${MAX_PAIRS} parejas.`);
  const numbers = new Set<number>();
  const ids = new Set<string>();
  for (const p of pairs) {
    if (!Number.isInteger(p.number) || p.number < 1) errors.push(`La pareja «${pairLabel(p)}» no tiene un número válido.`);
    if (numbers.has(p.number)) errors.push(`El número ${p.number} está repetido.`);
    if (ids.has(p.id)) errors.push(`Identificador repetido: ${p.id}.`);
    numbers.add(p.number);
    ids.add(p.id);
    if (!p.player1 || !p.player2) errors.push(`La pareja ${p.number} está incompleta.`);
  }
  return errors;
}

/**
 * Convierte texto pegado (una pareja por línea) en datos de pareja.
 * Formatos aceptados por línea:
 *   «Lloyd y HB», «Lloyd, HB», «Lloyd - HB», «Lloyd / HB», «Lloyd;HB»,
 *   y opcionalmente un nombre de pareja delante con dos puntos:
 *   «Los de Zizur: Lloyd y HB».
 */
export function parsePairLines(text: string): { pairs: PairInput[]; invalid: string[] } {
  const pairs: PairInput[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let name = '';
    let rest = line;
    const colon = line.indexOf(':');
    if (colon > 0) {
      name = line.slice(0, colon);
      rest = line.slice(colon + 1);
    }
    const parts = rest
      .split(/\s*(?:,|;|\t|\s\/\s|\/|\s-\s|\s+y\s+|\s+eta\s+|\s*&\s*)\s*/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 2) pairs.push({ name: cleanText(name), player1: cleanText(parts[0]), player2: cleanText(parts[1]) });
    else invalid.push(line);
  }
  return { pairs, invalid };
}

/** Búsqueda por número, nombre de pareja o integrantes (sin tildes ni mayúsculas). */
export function matchesSearch(pair: Pair, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  if (/^\d+$/.test(q)) return String(pair.number) === q || normalize(`${pair.name} ${pair.player1} ${pair.player2}`).includes(q);
  return normalize(`${pair.number} ${pair.name} ${pair.player1} ${pair.player2}`).includes(q);
}

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
