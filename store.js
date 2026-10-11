// Tiny IndexedDB key-value store. Falls back to memory if the browser blocks
// storage (e.g. some private-browsing modes); `persistent` tells you which.
const DB = 'anonchat', STORE = 'kv';
let dbp = null;
const mem = new Map();
export let persistent = true;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.onblocked = () => reject(new Error('blocked'));
      } catch (e) { reject(e); }
    }).catch(() => { persistent = false; return null; });
  }
  return dbp;
}
function run(mode, fn) {
  return open().then(db => !db ? null : new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  }));
}
export async function get(key) {
  const db = await open();
  if (!db) return mem.get(key);
  return run('readonly', s => s.get(key));
}
export async function set(key, value) {
  const db = await open();
  if (!db) { mem.set(key, value); return; }
  await run('readwrite', s => s.put(value, key));
}
export async function clearAll() {
  mem.clear();
  const db = await open();
  if (db) await run('readwrite', s => s.clear());
}
