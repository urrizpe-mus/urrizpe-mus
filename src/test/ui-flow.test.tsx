import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { indexedDbRepository as repo, closeDbForTests } from '../storage/indexeddb';
import { saveSettings, DEFAULT_SETTINGS } from '../storage/settings';

/**
 * Pruebas de interfaz de extremo a extremo (jsdom): recorren el uso real
 * durante un campeonato, desde crear hasta consultar la clasificación.
 */

beforeEach(async () => {
  for (const c of await repo.list()) await repo.remove(c.id);
  localStorage.clear();
  saveSettings({ ...DEFAULT_SETTINGS, drawAnimation: false });
  window.history.pushState({}, '', '/');
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('min-width') ? false : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  window.scrollTo = () => {};
  Element.prototype.scrollTo = function () {};
});

async function createChampionship(user: ReturnType<typeof userEvent.setup>, pairs: string) {
  render(<App />);
  await user.click((await screen.findAllByRole('button', { name: /crear campeonato/i }))[0]);
  await user.type(await screen.findByLabelText('Nombre'), 'Campeonato de fiestas');
  await user.click(screen.getByRole('button', { name: /pegar lista/i }));
  await user.type(screen.getByRole('textbox', { name: /pegar lista de parejas/i }), pairs);
  await user.click(screen.getByRole('button', { name: /añadir \d+ parejas/i }));
  await user.click(screen.getByRole('button', { name: /^crear campeonato$/i }));
  await screen.findByRole('heading', { name: 'Campeonato de fiestas' });
}

describe('flujo completo de un campeonato', () => {
  it('crear, sortear, confirmar, registrar ganadoras, corregir y consultar', async () => {
    const user = userEvent.setup();
    const lines = ['Lloyd y HB', 'Aratz y Egoitz', 'Jon y Mikel', 'Ane y Miren', 'Iker y Unai'].join('\n');
    await createChampionship(user, lines);

    // Panel con datos actualizados
    expect(screen.getByText('Parejas inscritas').previousSibling).toHaveTextContent('5');

    // Sorteo (5 parejas, cuadro recomendado de 4: 1 partido previo y 3 exentas)
    await user.click(screen.getAllByRole('link', { name: /^sorteo$/i })[0]);
    await user.click(await screen.findByRole('button', { name: /realizar sorteo/i }));
    expect(await screen.findByText('Sorteo sin confirmar', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getAllByText('Pase directo').length).toBeGreaterThanOrEqual(3);
    await user.click(screen.getByRole('button', { name: /confirmar cuadro/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /confirmar cuadro/i }));
    expect((await screen.findAllByText('Cuadro confirmado')).length).toBeGreaterThan(0);

    // Registrar ganadoras hasta la final
    await user.click(screen.getAllByRole('link', { name: /^partidos$/i })[0]);
    for (let i = 0; i < 4; i++) {
      const buttons = await screen.findAllByRole('button', { name: /seleccionar como ganadora/i });
      await user.click(buttons[0]);
      const confirm = await screen.findByRole('dialog');
      expect(within(confirm).getByText(/queda eliminada|será la campeona/)).toBeInTheDocument();
      await user.click(within(confirm).getByRole('button', { name: /registrar/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    }
    expect(await screen.findByText(/el campeonato ha terminado/i)).toBeInTheDocument();

    // No se puede registrar otra ganadora sin corregir: ya no hay botones de selección
    await user.click(screen.getByRole('tab', { name: /finalizados/i }));
    expect(screen.queryAllByRole('button', { name: /seleccionar como ganadora/i })).toHaveLength(0);

    // Corregir la final: no hay partidos posteriores que anular
    const correctButtons = screen.getAllByRole('button', { name: /corregir/i });
    await user.click(correctButtons[0]); // el más reciente (la final) aparece primero
    const corr = await screen.findByRole('dialog');
    expect(within(corr).getByText(/ningún partido posterior/i)).toBeInTheDocument();
    const radios = within(corr).getAllByRole('radio');
    const other = radios.find((r) => r.getAttribute('aria-checked') === 'false' && !/pendiente/i.test(r.textContent ?? ''))!;
    await user.click(other);
    await user.click(within(corr).getByRole('button', { name: /confirmar/i }));
    expect(await screen.findByText('Resultado corregido.')).toBeInTheDocument();

    // Clasificación
    await user.click(screen.getAllByRole('link', { name: /clasificación/i })[0]);
    expect(await screen.findByRole('heading', { name: /^campeona$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /subcampeona/i })).toBeInTheDocument();
    expect(screen.getByText('1.º')).toBeInTheDocument();
    expect(screen.getByText('3.º–4.º')).toBeInTheDocument();
    expect(screen.queryByText(/puntos|tantos/i)).not.toBeInTheDocument();

    // Persistencia: tras «cerrar y abrir» la app, todo sigue igual.
    await closeDbForTests();
    const [saved] = await repo.list();
    expect(saved.drawStatus).toBe('confirmed');
    expect(saved.bracket!.matches.every((x) => x.winner)).toBe(true);
    expect(saved.history.some((h) => h.type === 'winner-corrected')).toBe(true);
  }, 30000);

  it('avisa si hay menos parejas que el cuadro elegido', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click((await screen.findAllByRole('button', { name: /crear campeonato/i }))[0]);
    await user.type(await screen.findByLabelText('Nombre'), 'Pequeño');
    await user.click(screen.getByRole('radio', { name: /16/ }));
    await user.type(screen.getByLabelText('Integrante 1 1'), 'A');
    await user.type(screen.getByLabelText('Integrante 2 1'), 'B');
    await user.type(screen.getByLabelText('Integrante 1 2'), 'C');
    await user.type(screen.getByLabelText('Integrante 2 2'), 'D');
    expect(screen.getByText(/hay 2 parejas y este cuadro necesita 16/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^crear campeonato$/i }));
    expect(await repo.list()).toHaveLength(0); // no se crea ni se inventan parejas
  });

  it('gestiona parejas: añadir, editar, buscar y eliminar', async () => {
    const user = userEvent.setup();
    await createChampionship(user, 'Lloyd y HB\nAratz y Egoitz');
    await user.click(screen.getAllByRole('link', { name: /^parejas$/i })[0]);
    await user.click(await screen.findByRole('button', { name: /^añadir pareja$/i }));
    let dlg = await screen.findByRole('dialog');
    await user.type(within(dlg).getByLabelText('Integrante 1'), 'Jon');
    await user.type(within(dlg).getByLabelText('Integrante 2'), 'Mikel');
    await user.click(within(dlg).getByRole('button', { name: /guardar/i }));
    expect(await screen.findByText('Jon y Mikel')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Editar 1' }));
    dlg = await screen.findByRole('dialog');
    await user.type(within(dlg).getByLabelText(/nombre de pareja/i), 'Los Txapeldunak');
    await user.click(within(dlg).getByRole('button', { name: /guardar/i }));
    expect(await screen.findByText('Los Txapeldunak')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /buscar/i }), 'aratz');
    expect(screen.queryByText('Jon y Mikel')).not.toBeInTheDocument();
    expect(screen.getByText('Aratz y Egoitz')).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: /buscar/i }));

    await user.click(screen.getByRole('button', { name: 'Eliminar 3' }));
    dlg = await screen.findByRole('dialog');
    await user.click(within(dlg).getByRole('button', { name: /eliminar/i }));
    await waitFor(() => expect(screen.queryByText('Jon y Mikel')).not.toBeInTheDocument());
    const [saved] = await repo.list();
    expect(saved.pairs.map((p) => p.number)).toEqual([1, 2]);
  });

  it('exporta e importa una copia de seguridad desde la interfaz', async () => {
    const user = userEvent.setup();
    await createChampionship(user, 'Lloyd y HB\nAratz y Egoitz');
    const [saved] = await repo.list();
    const { backupToJson, createBackup } = await import('../io/backup');
    const json = backupToJson(createBackup([saved]));

    window.history.pushState({}, '', '/ajustes');
    render(<App />);
    await user.click((await screen.findAllByRole('button', { name: /importar copia de seguridad/i }))[0]);
    const file = new File([json], 'copia.json', { type: 'application/json' });
    await user.upload(screen.getByTestId('import-file'), file);
    expect(await screen.findByText(/ya existe en este dispositivo/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^importar$/i }));
    await waitFor(async () => expect(await repo.list()).toHaveLength(2)); // importado como copia
  });
});
