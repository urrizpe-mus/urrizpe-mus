import { createContext, useContext, type ReactNode } from 'react';
import type { RoundPlan } from '../domain/types';
import { roundNameKey } from '../domain/standings';
import { es, type Messages } from './es';

/**
 * Sistema de textos. Hoy solo existe español; el euskera se añade creando
 * `eu.ts` con el tipo `Messages` y registrándolo aquí.
 */
const catalogs: Record<string, Messages> = { es };

const I18nContext = createContext<Messages>(es);

export function I18nProvider({ language, children }: { language: string; children: ReactNode }) {
  return <I18nContext.Provider value={catalogs[language] ?? es}>{children}</I18nContext.Provider>;
}

export function useT(): Messages {
  return useContext(I18nContext);
}

type RoundTexts = Messages['rounds']['short'];

function fromKey(texts: RoundTexts, round: RoundPlan, rounds: RoundPlan[]): string {
  const k = roundNameKey(round, rounds);
  switch (k.key) {
    case 'prelim':
      return texts.prelim(k.n, k.single);
    case 'roundOfN':
      return texts.roundOfN(k.n);
    default:
      return texts[k.key];
  }
}

export function roundName(m: Messages, round: RoundPlan, rounds: RoundPlan[]): string {
  return fromKey(m.rounds, round, rounds);
}
export function roundShort(m: Messages, round: RoundPlan, rounds: RoundPlan[]): string {
  return fromKey(m.rounds.short, round, rounds);
}
export function roundEliminated(m: Messages, round: RoundPlan, rounds: RoundPlan[]): string {
  return fromKey(m.rounds.eliminatedIn, round, rounds);
}

export function formatDate(iso: string, withTime = false): string {
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'long' }).format(d);
}
