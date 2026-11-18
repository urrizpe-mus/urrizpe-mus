import { bracketIntegrityErrors } from '../domain/bracket';
import { cleanText, pairListErrors } from '../domain/pairs';
import { SCHEMA_VERSION, type Bracket, type Championship, type Pair } from '../domain/types';

/**
 * Formato de copia de seguridad (JSON).
 * {
 *   "app": "urrizpe-mus", "kind": "backup", "schemaVersion": 1,
 *   "exportedAt": "...", "championships": [ ... ]
 * }
 */
export interface BackupFile {
  app: 'urrizpe-mus';
  kind: 'backup';
  schemaVersion: typeof SCHEMA_VERSION;
  exportedAt: string;
  championships: Championship[];
}

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export function createBackup(championships: Championship[], now = new Date().toISOString()): BackupFile {
  return { app: 'urrizpe-mus', kind: 'backup', schemaVersion: SCHEMA_VERSION, exportedAt: now, championships };
}

export function backupToJson(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isIso = (v: unknown) => isStr(v) && !Number.isNaN(Date.parse(v));
const isInt = (v: unknown, min = 0) => Number.isInteger(v) && (v as number) >= min;

function validatePair(raw: unknown, i: number): Pair {
  if (!isObj(raw)) throw new ImportError(`Pareja ${i + 1}: formato incorrecto.`);
  if (!isStr(raw.id) || !raw.id) throw new ImportError(`Pareja ${i + 1}: falta el identificador.`);
  if (!isInt(raw.number, 1)) throw new ImportError(`Pareja ${i + 1}: número no válido.`);
  const pair: Pair = {
    id: raw.id.slice(0, 64),
    number: raw.number as number,
    name: cleanText(raw.name),
    player1: cleanText(raw.player1),
    player2: cleanText(raw.player2),
    createdAt: isIso(raw.createdAt) ? (raw.createdAt as string) : new Date(0).toISOString(),
  };
  if (!pair.player1 || !pair.player2) throw new ImportError(`Pareja ${pair.number}: faltan integrantes.`);
  return pair;
}

function validateBracketShape(raw: unknown): Bracket {
  if (!isObj(raw) || !Array.isArray(raw.rounds) || !Array.isArray(raw.matches) || !Array.isArray(raw.byes) || !isStr(raw.drawId)) {
    throw new ImportError('El cuadro tiene un formato incorrecto.');
  }
  const sideOk = (s: unknown) =>
    isObj(s) && ((s.from === 'match' && isStr(s.matchId)) || ((s.from === 'pair' || s.from === 'bye') && isStr(s.pairId)));
  for (const m of raw.matches) {
    if (
      !isObj(m) ||
      !isStr(m.id) ||
      !isInt(m.number, 1) ||
      !isInt(m.round) ||
      !isInt(m.position) ||
      !sideOk(m.sideA) ||
      !sideOk(m.sideB) ||
      !(m.winner === null || m.winner === 'A' || m.winner === 'B')
    ) {
      throw new ImportError('Hay un partido con formato incorrecto.');
    }
  }
  for (const r of raw.rounds) {
    if (!isObj(r) || !isInt(r.entrants, 2) || !isInt(r.target, 1) || !isInt(r.matches, 1) || !isInt(r.byes) || !(r.kind === 'prelim' || r.kind === 'main')) {
      throw new ImportError('Hay una ronda con formato incorrecto.');
    }
  }
  for (const b of raw.byes) if (!isObj(b) || !isStr(b.pairId) || !isInt(b.position)) throw new ImportError('Hay un pase directo con formato incorrecto.');
  return raw as unknown as Bracket;
}

/** Valida y normaliza un campeonato importado. Lanza ImportError si no es fiable. */
export function validateChampionship(raw: unknown): Championship {
  if (!isObj(raw)) throw new ImportError('El campeonato tiene un formato incorrecto.');
  if (raw.schemaVersion !== SCHEMA_VERSION) throw new ImportError('La copia es de una versión no compatible.');
  if (!isStr(raw.id) || !raw.id) throw new ImportError('Falta el identificador del campeonato.');
  const name = cleanText(raw.name, 80);
  if (!name) throw new ImportError('El campeonato no tiene nombre.');
  if (!isStr(raw.date) || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) throw new ImportError(`«${name}»: fecha no válida.`);
  if (![2, 4, 8, 16, 32].includes(raw.mainDrawSize as number)) throw new ImportError(`«${name}»: cuadro principal no válido.`);
  if (!Array.isArray(raw.pairs)) throw new ImportError(`«${name}»: falta la lista de parejas.`);
  const pairs = raw.pairs.map(validatePair);
  const dupNumbers = pairListErrors(pairs).filter((e) => /repetid/.test(e));
  if (dupNumbers.length) throw new ImportError(`«${name}»: ${dupNumbers[0]}`);
  const maxNumber = pairs.reduce((m, p) => Math.max(m, p.number), 0);
  const drawStatus = raw.drawStatus;
  if (drawStatus !== 'none' && drawStatus !== 'preview' && drawStatus !== 'confirmed') throw new ImportError(`«${name}»: estado del sorteo no válido.`);

  let bracket: Bracket | null = null;
  if (drawStatus !== 'none') {
    bracket = validateBracketShape(raw.bracket);
    if (!isObj(raw.draw) || raw.draw.id !== bracket.drawId) throw new ImportError(`«${name}»: el sorteo no coincide con el cuadro.`);
    let errors: string[];
    try {
      errors = bracketIntegrityErrors(bracket, pairs.map((p) => p.id));
    } catch {
      errors = ['referencias rotas'];
    }
    if (errors.length) throw new ImportError(`«${name}»: el cuadro no es coherente (${errors[0]}).`);
  } else if (raw.bracket) {
    throw new ImportError(`«${name}»: hay un cuadro sin sorteo.`);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    id: raw.id.slice(0, 64),
    name,
    date: raw.date,
    description: cleanText(raw.description, 500),
    competitionType: 'single-elimination',
    mainDrawSize: raw.mainDrawSize as number,
    pairs,
    nextPairNumber: Math.max(isInt(raw.nextPairNumber, 1) ? (raw.nextPairNumber as number) : 1, maxNumber + 1),
    drawStatus,
    draw: drawStatus === 'none' ? null : (raw.draw as unknown as Championship['draw']),
    bracket,
    previousDraws: Array.isArray(raw.previousDraws) ? (raw.previousDraws.filter(isObj) as unknown as Championship['previousDraws']) : [],
    history: Array.isArray(raw.history)
      ? raw.history
          .filter((h): h is Record<string, unknown> => isObj(h) && isIso(h.at) && isStr(h.type) && isStr(h.message))
          .map((h) => ({ at: h.at as string, type: h.type as Championship['history'][number]['type'], message: cleanText(h.message, 300) }))
      : [],
    createdAt: isIso(raw.createdAt) ? (raw.createdAt as string) : new Date().toISOString(),
    updatedAt: isIso(raw.updatedAt) ? (raw.updatedAt as string) : new Date().toISOString(),
    revision: isInt(raw.revision) ? (raw.revision as number) : 0,
  };
}

/** Lee el texto de un archivo de copia y devuelve los campeonatos validados. */
export function parseBackup(text: string): Championship[] {
  if (text.length > MAX_IMPORT_BYTES) throw new ImportError('El archivo es demasiado grande.');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('El archivo no es un JSON válido.');
  }
  if (!isObj(data) || data.app !== 'urrizpe-mus') throw new ImportError('El archivo no es una copia de seguridad de URRIZPE MUS.');
  if (data.schemaVersion !== SCHEMA_VERSION) throw new ImportError('La copia es de una versión no compatible.');
  if (!Array.isArray(data.championships) || !data.championships.length) throw new ImportError('La copia no contiene campeonatos.');
  const list = data.championships.map(validateChampionship);
  if (new Set(list.map((c) => c.id)).size !== list.length) throw new ImportError('La copia contiene campeonatos repetidos.');
  return list;
}

/** Nombre de archivo seguro: «urrizpe-mus_nombre_2026-11-18.json». */
export function safeFileName(base: string, ext: string): string {
  const slug = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `urrizpe-mus_${slug || 'campeonato'}.${ext}`;
}

export function downloadText(content: string | Blob, fileName: string, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
