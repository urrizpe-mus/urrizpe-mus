import { describe, expect, it } from 'vitest';
import { matchPairs } from './bracket';
import {
  addPairs,
  confirmDraw,
  correctMatch,
  createChampionship,
  discardDraft,
  generateDraw,
  removePair,
  setWinner,
  updateDetails,
  updatePair,
} from './championship';
import { parsePairLines, matchesSearch } from './pairs';
import { DomainError } from './types';

const base = () =>
  createChampionship({
    name: 'Mus de fiestas',
    mainDrawSize: 4,
    pairs: [
      { player1: 'Lloyd', player2: 'HB' },
      { player1: 'Aratz', player2: 'Egoitz' },
      { player1: 'Jugador 3', player2: 'Jugador 4' },
      { player1: 'Jugador 5', player2: 'Jugador 6' },
      { player1: 'Jugador 7', player2: 'Jugador 8' },
    ],
  });

describe('ciclo de vida del campeonato', () => {
  it('numera parejas de forma única y estable', () => {
    let ch = base();
    expect(ch.pairs.map((p) => p.number)).toEqual([1, 2, 3, 4, 5]);
    ch = removePair(ch, ch.pairs[1].id);
    ch = addPairs(ch, [{ player1: 'X', player2: 'Y' }]);
    expect(ch.pairs.map((p) => p.number)).toEqual([1, 3, 4, 5, 6]); // el 2 no se reutiliza
    const renamed = updatePair(ch, ch.pairs[0].id, { name: 'Los rápidos', player1: 'Lloyd', player2: 'HB' });
    expect(renamed.pairs[0].number).toBe(1);
  });

  it('no permite registrar ganadoras antes de confirmar el cuadro', () => {
    const ch = generateDraw(base());
    const m = ch.bracket!.matches[0];
    expect(() => setWinner(ch, m.id, matchPairs(ch.bracket!, m)[0]!)).toThrowError(/confirmar/);
  });

  it('nunca modifica un cuadro confirmado sin confirmación expresa', () => {
    const ch = confirmDraw(generateDraw(base()));
    expect(() => generateDraw(ch)).toThrowError(DomainError);
    expect(() => addPairs(ch, [{ player1: 'a', player2: 'b' }])).toThrowError(/confirmado/);
    expect(() => removePair(ch, ch.pairs[0].id)).toThrowError(/confirmado/);
    expect(() => updateDetails(ch, { mainDrawSize: 2 })).toThrowError(/confirmado/);
    // Los nombres sí se pueden corregir: el cuadro usa identificadores.
    const renamed = updatePair(ch, ch.pairs[0].id, { player1: 'Lloyd', player2: 'H. B.' });
    expect(renamed.bracket).toBe(ch.bracket);
    // Nuevo sorteo solo con confirmación: archiva el anterior.
    const redrawn = generateDraw(ch, { replaceConfirmed: true });
    expect(redrawn.drawStatus).toBe('preview');
    expect(redrawn.previousDraws[0].id).toBe(ch.draw!.id);
  });

  it('cambiar participantes descarta un sorteo sin confirmar', () => {
    const preview = generateDraw(base());
    const changed = addPairs(preview, [{ player1: 'a', player2: 'b' }]);
    expect(changed.drawStatus).toBe('none');
    expect(changed.bracket).toBeNull();
    expect(discardDraft(generateDraw(base())).drawStatus).toBe('none');
  });

  it('registra la campeona y el historial', () => {
    let ch = confirmDraw(generateDraw(base()));
    for (let r = 0; r < ch.bracket!.rounds.length; r++) {
      for (const m of ch.bracket!.matches.filter((x) => x.round === r)) {
        ch = setWinner(ch, m.id, matchPairs(ch.bracket!, m)[0]!);
      }
    }
    expect(ch.history[0].message).toMatch(/^Final: campeona/);
    const first = ch.bracket!.matches[0];
    const { championship, invalidated } = correctMatch(ch, first.id, matchPairs(ch.bracket!, first)[1]!);
    expect(invalidated.length).toBeGreaterThan(0);
    expect(championship.history[0].type).toBe('winner-corrected');
  });
});

describe('alta rápida de parejas', () => {
  it('entiende varios formatos por línea', () => {
    const { pairs, invalid } = parsePairLines('Lloyd y HB\nAratz, Egoitz\nLos de arriba: Ane / Miren\nJon - Mikel\nsolo\n\nIker eta Unai');
    expect(pairs).toEqual([
      { name: '', player1: 'Lloyd', player2: 'HB' },
      { name: '', player1: 'Aratz', player2: 'Egoitz' },
      { name: 'Los de arriba', player1: 'Ane', player2: 'Miren' },
      { name: '', player1: 'Jon', player2: 'Mikel' },
      { name: '', player1: 'Iker', player2: 'Unai' },
    ]);
    expect(invalid).toEqual(['solo']);
  });

  it('busca por número, nombre e integrantes sin tildes', () => {
    const b = base();
    const ch = updatePair(b, b.pairs[0].id, { name: 'Peña Ñandú', player1: 'Iñaki', player2: 'José' });
    const p = ch.pairs[0];
    expect(matchesSearch(p, '1')).toBe(true);
    expect(matchesSearch(p, 'jose')).toBe(true);
    expect(matchesSearch(p, 'peña')).toBe(true);
    expect(matchesSearch(p, 'aratz')).toBe(false);
  });
});
