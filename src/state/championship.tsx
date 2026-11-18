import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Championship } from '../domain/types';
import { DomainError } from '../domain/types';
import { onExternalChange } from '../storage/indexeddb';
import { StaleWriteError } from '../storage/repository';
import { useT } from '../i18n';
import { useApp } from './app';

interface ChampionshipContextValue {
  championship: Championship;
  /**
   * Aplica una operación del dominio y guarda el resultado.
   * Devuelve el campeonato guardado o null si falló (ya se ha avisado al usuario).
   */
  apply: (op: (c: Championship) => Championship, success?: string) => Promise<Championship | null>;
  saving: boolean;
}

const Ctx = createContext<ChampionshipContextValue | null>(null);

export type LoadState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; championship: Championship };

/** Carga un campeonato y lo mantiene al día si cambia en otra pestaña. */
export function useLoadChampionship(id: string | undefined) {
  const { repo } = useApp();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const reload = useCallback(async () => {
    if (!id) return setState({ status: 'missing' });
    const found = await repo.get(id);
    setState(found ? { status: 'ready', championship: found } : { status: 'missing' });
  }, [id, repo]);
  useEffect(() => {
    setState({ status: 'loading' });
    reload().catch(() => setState({ status: 'missing' }));
    return onExternalChange((changed) => {
      if (!changed || changed === id) reload().catch(() => undefined);
    });
  }, [id, reload]);
  return { state, setState, reload };
}

export function ChampionshipProvider({ initial, onChange, reload, children }: { initial: Championship; onChange: (c: Championship) => void; reload: () => Promise<void>; children: ReactNode }) {
  const { repo, toast } = useApp();
  const m = useT();
  const [saving, setSaving] = useState(false);
  const latest = useRef(initial);
  latest.current = initial;
  // Cola: las operaciones se guardan de una en una, en orden.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const apply = useCallback<ChampionshipContextValue['apply']>(
    (op, success) => {
      const run = async () => {
        const current = latest.current;
        let next: Championship;
        try {
          next = op(current);
        } catch (e) {
          toast(e instanceof DomainError ? e.message : m.errors.generic, 'error');
          return null;
        }
        if (next === current) return current;
        setSaving(true);
        try {
          const saved = await repo.save(next, current.revision);
          latest.current = saved;
          onChange(saved);
          if (success) toast(success);
          return saved;
        } catch (e) {
          if (e instanceof StaleWriteError) {
            toast(m.errors.stale, 'error');
            await reload();
          } else {
            toast(m.errors.storage, 'error');
          }
          return null;
        } finally {
          setSaving(false);
        }
      };
      const result = queue.current.then(run, run);
      queue.current = result;
      return result;
    },
    [repo, onChange, reload, toast, m],
  );

  return <Ctx.Provider value={{ championship: initial, apply, saving }}>{children}</Ctx.Provider>;
}

export function useChampionship(): ChampionshipContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useChampionship fuera de ChampionshipProvider');
  return ctx;
}
