/**
 * Modelo de datos de URRIZPE MUS.
 *
 * Todo el dominio es puro (sin React, sin almacenamiento): las funciones
 * reciben objetos y devuelven objetos nuevos. Así el motor se puede probar
 * y reutilizar (por ejemplo, en un futuro backend) sin la interfaz.
 */

export const SCHEMA_VERSION = 1 as const;

/** Tamaños de cuadro principal admitidos (potencias de 2). */
export const MAIN_DRAW_SIZES = [32, 16, 8, 4, 2] as const;
export type MainDrawSize = (typeof MAIN_DRAW_SIZES)[number];

/** Límite razonable de parejas por campeonato. */
export const MAX_PAIRS = 256;

export interface Pair {
  /** Identificador interno estable (UUID). */
  id: string;
  /** Número público de la pareja. Único y fijo dentro del campeonato. */
  number: number;
  /** Nombre opcional de la pareja. */
  name: string;
  player1: string;
  player2: string;
  createdAt: string;
}

/** Plan de una ronda: cuántas parejas entran y cuántas salen. */
export interface RoundPlan {
  index: number;
  kind: 'prelim' | 'main';
  /** Parejas que entran en la ronda. */
  entrants: number;
  /** Parejas que pasan a la siguiente ronda (1 en la final). */
  target: number;
  /** Partidos que se juegan = entrants − target. */
  matches: number;
  /** Pases directos = 2·target − entrants. */
  byes: number;
  /** Orden de fase previa (1, 2...) o 0 si es del cuadro principal. */
  prelimNumber: number;
}

/** Origen de cada lado de un partido. */
export type Side =
  | { from: 'pair'; pairId: string }
  | { from: 'bye'; pairId: string }
  | { from: 'match'; matchId: string };

export interface Match {
  id: string;
  /** Número visible del partido (1..P−1). */
  number: number;
  round: number;
  /**
   * Posición dentro de la ronda. En la primera ronda es la posición de la
   * "unidad" (partido o pase directo); en las demás, la posición del partido.
   * El partido en la posición j de la ronda r+1 recibe a las unidades/partidos
   * 2j y 2j+1 de la ronda r.
   */
  position: number;
  sideA: Side;
  sideB: Side;
  winner: 'A' | 'B' | null;
  decidedAt: string | null;
}

export interface Bye {
  pairId: string;
  /** Posición de la unidad en la primera ronda. */
  position: number;
}

export interface Bracket {
  drawId: string;
  rounds: RoundPlan[];
  matches: Match[];
  byes: Bye[];
}

export type DrawStrategy = 'random';

export interface DrawParticipant {
  pairId: string;
  number: number;
  label: string;
}

export interface DrawRecord {
  id: string;
  createdAt: string;
  confirmedAt: string | null;
  strategy: DrawStrategy;
  algorithm: 'fisher-yates';
  randomSource: 'crypto.getRandomValues';
  config: { pairCount: number; mainDrawSize: number };
  participants: DrawParticipant[];
  /** Orden de las parejas tras el barajado. */
  order: string[];
  /** Distribución de partidos y pases directos en la primera ronda. */
  layout: ('match' | 'bye')[];
  rounds: RoundPlan[];
}

export type HistoryType =
  | 'created'
  | 'updated'
  | 'pair-added'
  | 'pair-updated'
  | 'pair-removed'
  | 'draw-generated'
  | 'draw-discarded'
  | 'draw-confirmed'
  | 'winner-set'
  | 'winner-corrected'
  | 'winner-cleared'
  | 'imported';

export interface HistoryEntry {
  at: string;
  type: HistoryType;
  message: string;
}

export type DrawStatus = 'none' | 'preview' | 'confirmed';

export interface Championship {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  name: string;
  /** Fecha en formato AAAA-MM-DD. */
  date: string;
  description: string;
  competitionType: 'single-elimination';
  mainDrawSize: number;
  pairs: Pair[];
  nextPairNumber: number;
  drawStatus: DrawStatus;
  draw: DrawRecord | null;
  bracket: Bracket | null;
  /** Sorteos anteriores descartados (solo registro). */
  previousDraws: DrawRecord[];
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
  /** Se incrementa en cada guardado; evita que datos antiguos pisen a los nuevos. */
  revision: number;
}

/** Error de dominio con código estable para la interfaz y las pruebas. */
export class DomainError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'DomainError';
  }
}
