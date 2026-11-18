import { beforeEach, describe, expect, it } from 'vitest';
import { matchPairs } from '../domain/bracket';
import { confirmDraw, correctMatch, createChampionship, generateDraw, setWinner } from '../domain/championship';
import { backupToJson, createBackup, ImportError, parseBackup } from '../io/backup';
import { closeDbForTests, indexedDbRepository as repo } from './indexeddb';
import { StaleWriteError } from './repository';

function sample(n = 8) {
  const pairs = Array.from({ length: n }, (_, i) => ({ player1: `A${i + 1}`, player2: `B${i + 1}` }));
  let ch = createChampionship({ name: 'Campeonato de prueba', date: '2026-11-18', mainDrawSize: 8, pairs });
  ch = confirmDraw(generateDraw(ch));
  const m = ch.bracket!.matches[0];
  ch = setWinner(ch, m.id, matchPairs(ch.bracket!, m)[0]!);
  return ch;
}

beforeEach(async () => {
  for (const c of await repo.list()) await repo.remove(c.id);
});

describe('persistencia en IndexedDB', () => {
  it('14: los datos siguen ahí después de cerrar y volver a abrir la app', async () => {
    const ch = sample();
    const saved = await repo.save(ch, null);
    expect(saved.revision).toBe(1);
    await closeDbForTests(); // simula cerrar el navegador
    const loaded = await repo.get(ch.id);
    expect(loaded).toEqual(saved);
    expect(loaded!.bracket!.matches[0].winner).not.toBeNull();
  });

  it('una revisión antigua no puede sobrescribir datos nuevos', async () => {
    const ch = sample();
    const v1 = await repo.save(ch, null);
    const v2 = await repo.save({ ...v1, name: 'Nuevo nombre' }, v1.revision);
    await expect(repo.save({ ...v1, name: 'Viejo' }, v1.revision)).rejects.toBeInstanceOf(StaleWriteError);
    expect((await repo.get(ch.id))!.name).toBe(v2.name);
  });

  it('no mezcla datos de campeonatos distintos', async () => {
    const a = await repo.save(sample(), null);
    const b = await repo.save(createChampionship({ name: 'Otro', mainDrawSize: 4 }), null);
    expect((await repo.list()).map((c) => c.id).sort()).toEqual([a.id, b.id].sort());
    expect((await repo.get(b.id))!.pairs).toHaveLength(0);
    await repo.remove(a.id);
    expect(await repo.get(a.id)).toBeNull();
    expect(await repo.get(b.id)).not.toBeNull();
  });
});

describe('15: exportación e importación', () => {
  it('ida y vuelta conserva todo el campeonato', () => {
    const ch = sample(23);
    const json = backupToJson(createBackup([ch]));
    const [back] = parseBackup(json);
    expect(back).toEqual(ch);
  });

  it('corrección registrada sobrevive a la exportación', () => {
    let ch = sample(8);
    const m = ch.bracket!.matches[0];
    ch = correctMatch(ch, m.id, matchPairs(ch.bracket!, m)[1]!).championship;
    const [back] = parseBackup(backupToJson(createBackup([ch])));
    expect(back.bracket!.matches[0].winner).toBe('B');
  });

  it('rechaza archivos que no son copias válidas', () => {
    expect(() => parseBackup('no es json')).toThrow(ImportError);
    expect(() => parseBackup('{"app":"otra"}')).toThrow(/URRIZPE/);
    const ch = sample();
    const broken = JSON.parse(backupToJson(createBackup([ch])));
    broken.championships[0].bracket.byes.push({ pairId: broken.championships[0].pairs[0].id, position: 0 });
    expect(() => parseBackup(JSON.stringify(broken))).toThrow(/coherente/);
    const dup = JSON.parse(backupToJson(createBackup([ch])));
    dup.championships[0].pairs[1].number = dup.championships[0].pairs[0].number;
    expect(() => parseBackup(JSON.stringify(dup))).toThrow(/repetido/);
    const noPlayer = JSON.parse(backupToJson(createBackup([ch])));
    noPlayer.championships[0].pairs[0].player1 = '   ';
    expect(() => parseBackup(JSON.stringify(noPlayer))).toThrow(/integrantes/);
  });

  it('limpia texto peligroso o con caracteres de control', () => {
    const ch = sample();
    const raw = JSON.parse(backupToJson(createBackup([ch])));
    raw.championships[0].pairs[0].player1 = 'Lloyd\u0000\n<script>';
    const [back] = parseBackup(JSON.stringify(raw));
    expect(back.pairs[0].player1).toBe('Lloyd <script>'); // React lo mostrará como texto, nunca como HTML
  });
});
