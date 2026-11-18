/**
 * Aleatoriedad del sorteo oficial.
 *
 * - Fuente: crypto.getRandomValues() (generador criptográfico del navegador).
 * - Enteros sin sesgo mediante muestreo por rechazo (nunca "x % n" a secas).
 * - Barajado con Fisher-Yates (Durstenfeld), que da la misma probabilidad
 *   a cada una de las n! permutaciones si los enteros son uniformes.
 */

export interface RandomSource {
  /** Entero uniforme en [0, maxExclusive). */
  int(maxExclusive: number): number;
}

const UINT32_RANGE = 0x1_0000_0000;

export function createCryptoRandom(cryptoImpl: Crypto = globalThis.crypto): RandomSource {
  if (!cryptoImpl || typeof cryptoImpl.getRandomValues !== 'function') {
    throw new Error('El navegador no ofrece crypto.getRandomValues(); no se puede hacer un sorteo oficial.');
  }
  const buffer = new Uint32Array(1);
  return {
    int(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
        throw new RangeError(`Rango no válido: ${maxExclusive}`);
      }
      // Mayor múltiplo de maxExclusive que cabe en 2^32: los valores por
      // encima se descartan para que todos los restos sean equiprobables.
      const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
      for (;;) {
        cryptoImpl.getRandomValues(buffer);
        const value = buffer[0];
        if (value < limit) return value % maxExclusive;
      }
    },
  };
}

/** Devuelve una copia barajada con Fisher-Yates. No modifica la entrada. */
export function fisherYates<T>(items: readonly T[], random: RandomSource): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = random.int(i + 1);
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/** Identificador único (UUID v4) usando la misma fuente criptográfica. */
export function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
