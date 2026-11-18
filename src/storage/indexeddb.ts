import type { Championship } from '../domain/types';
import { StaleWriteError, type ChampionshipRepository } from './repository';

const DB_NAME = 'urrizpe-mus';
const DB_VERSION = 1;
const STORE = 'championships';

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('Este navegador no permite guardar datos (IndexedDB no disponible).'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

/** Aviso entre pestañas abiertas de la app cuando cambian los datos. */
const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('urrizpe-mus-data') : null;

export function onExternalChange(listener: (id: string | null) => void): () => void {
  if (!channel) return () => {};
  const handler = (e: MessageEvent) => listener(typeof e.data?.id === 'string' ? e.data.id : null);
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}

function notify(id: string) {
  try {
    channel?.postMessage({ id });
  } catch {
    /* sin aviso entre pestañas: no es crítico */
  }
}

export const indexedDbRepository: ChampionshipRepository = {
  async list() {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const all = await promisify(tx.objectStore(STORE).getAll() as IDBRequest<Championship[]>);
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async get(id) {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const found = await promisify(tx.objectStore(STORE).get(id) as IDBRequest<Championship | undefined>);
    return found ?? null;
  },

  async save(championship, expectedRevision) {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    // Lectura y escritura en la misma transacción: comprobación atómica.
    const current = await promisify(store.get(championship.id) as IDBRequest<Championship | undefined>);
    const currentRevision = current ? current.revision : null;
    if (currentRevision !== expectedRevision) {
      tx.abort();
      await done(tx).catch(() => undefined);
      throw new StaleWriteError();
    }
    const next = { ...championship, revision: (currentRevision ?? 0) + 1 };
    store.put(next);
    await done(tx);
    notify(next.id);
    return next;
  },

  async overwrite(championship) {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const current = await promisify(store.get(championship.id) as IDBRequest<Championship | undefined>);
    const next = { ...championship, revision: Math.max(current?.revision ?? 0, championship.revision) + 1 };
    store.put(next);
    await done(tx);
    notify(next.id);
    return next;
  },

  async remove(id) {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await done(tx);
    notify(id);
  },
};

/** Pide al navegador que no borre los datos si necesita espacio. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

/** Solo para pruebas: cierra la conexión para simular «cerrar y abrir la app». */
export async function closeDbForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}
