// Local database on the device (IndexedDB). Handles thousands of customers and
// hundreds of thousands of entries, and stores receipt photos as binary files.

let dbp = null;

function getDb() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open('khata-book', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore('customers', { keyPath: 'id' });
        const t = db.createObjectStore('transactions', { keyPath: 'id' });
        t.createIndex('dateKey', 'dateKey');
        t.createIndex('customerId', 'customerId');
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  return dbp;
}

export const req = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

// Runs `work(tx)` inside one transaction: either everything is saved, or nothing.
// Inside `work`, only await IndexedDB requests (otherwise the transaction closes early).
export async function run(stores, mode, work) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;
    Promise.resolve()
      .then(() => work(tx))
      .then((r) => {
        result = r;
      })
      .catch((e) => {
        try {
          tx.abort();
        } catch (_) {
          /* already finished */
        }
        reject(e);
      });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Save cancelled'));
  });
}

export const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

// Receipt photos are stored as Blobs; this creates a viewable address for them.
const urls = new Map();
function withUrl(t) {
  if (!t.photoBlob) return t;
  const key = `${t.id}:${t.updatedAt || t.createdAt}`;
  let u = urls.get(key);
  if (!u) {
    u = URL.createObjectURL(t.photoBlob);
    urls.set(key, u);
  }
  return { ...t, photoUrl: u };
}

export const allCustomers = () => run('customers', 'readonly', (tx) => req(tx.objectStore('customers').getAll()));

export const allTransactionsRaw = () =>
  run('transactions', 'readonly', (tx) => req(tx.objectStore('transactions').getAll()));

const query = (index, range) =>
  run('transactions', 'readonly', (tx) => req(tx.objectStore('transactions').index(index).getAll(range))).then((rows) =>
    rows.map(withUrl)
  );

export const txnsOnDay = (day) => query('dateKey', IDBKeyRange.only(day));
export const txnsInRange = (from, to) => query('dateKey', IDBKeyRange.bound(from, to));
export const txnsOfCustomer = (id) => query('customerId', IDBKeyRange.only(id));
