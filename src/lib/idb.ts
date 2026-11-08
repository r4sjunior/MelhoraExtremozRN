// Armazenamento simples no IndexedDB: rascunho do problema (com fotos) e dados do modo de teste.
const BANCO = 'melhora-extremoz';
let conexao: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  return (conexao ||= new Promise((ok, falha) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  }));
}

export async function idbLer<T>(chave: string): Promise<T | null> {
  try {
    const db = await abrir();
    return await new Promise((ok) => {
      const q = db.transaction('kv').objectStore('kv').get(chave);
      q.onsuccess = () => ok((q.result as T) ?? null);
      q.onerror = () => ok(null);
    });
  } catch {
    return null;
  }
}

export async function idbGravar(chave: string, valor: unknown): Promise<void> {
  try {
    const db = await abrir();
    await new Promise<void>((ok, falha) => {
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').put(valor, chave);
      t.oncomplete = () => ok();
      t.onerror = () => falha(t.error);
      t.onabort = () => falha(t.error);
    });
  } catch { /* navegação privada ou cota cheia: segue sem guardar */ }
}

export async function idbApagar(chave: string): Promise<void> {
  try {
    const db = await abrir();
    db.transaction('kv', 'readwrite').objectStore('kv').delete(chave);
  } catch { /* nada a fazer */ }
}

export function lerLocal(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
export function gravarLocal(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ }
}
