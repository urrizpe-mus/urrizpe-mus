import type { Championship } from '../domain/types';

/**
 * Contrato de persistencia. La interfaz solo conoce este contrato, de modo
 * que en el futuro se puede añadir una implementación en la nube (por
 * ejemplo Supabase) sin cambiar pantallas ni motor.
 */
export interface ChampionshipRepository {
  list(): Promise<Championship[]>;
  get(id: string): Promise<Championship | null>;
  /**
   * Guarda el campeonato. Si `expectedRevision` no coincide con la guardada,
   * lanza `StaleWriteError`: así una pestaña o copia antigua nunca pisa
   * datos más nuevos. Devuelve el campeonato con la revisión incrementada.
   */
  save(championship: Championship, expectedRevision: number | null): Promise<Championship>;
  /** Sobrescribe sin comprobar revisión (solo tras confirmación expresa, p. ej. al importar). */
  overwrite(championship: Championship): Promise<Championship>;
  remove(id: string): Promise<void>;
}

export class StaleWriteError extends Error {
  constructor() {
    super('Este campeonato se ha modificado en otra pestaña o ventana. Se recargarán los datos más recientes.');
    this.name = 'StaleWriteError';
  }
}
