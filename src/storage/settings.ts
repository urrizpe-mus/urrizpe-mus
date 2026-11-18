/** Preferencias sencillas (localStorage). Los campeonatos van en IndexedDB. */

export type Language = 'es' | 'eu';

export interface Settings {
  language: Language;
  /** Pedir confirmación antes de registrar una ganadora. */
  confirmWinner: boolean;
  /** Animación breve al mostrar el sorteo (no afecta al resultado). */
  drawAnimation: boolean;
}

export const DEFAULT_SETTINGS: Settings = { language: 'es', confirmWinner: true, drawAnimation: true };

const KEY = 'urrizpe-mus:settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      language: parsed.language === 'eu' ? 'eu' : 'es',
      confirmWinner: typeof parsed.confirmWinner === 'boolean' ? parsed.confirmWinner : DEFAULT_SETTINGS.confirmWinner,
      drawAnimation: typeof parsed.drawAnimation === 'boolean' ? parsed.drawAnimation : DEFAULT_SETTINGS.drawAnimation,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* almacenamiento lleno o bloqueado: se mantienen en memoria */
  }
}
