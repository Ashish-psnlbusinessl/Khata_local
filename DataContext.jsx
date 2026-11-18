import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { allCustomers, allTransactionsRaw, newId, req, run, txnsInRange } from '../lib/db';
import { compressImage } from '../lib/image';
import { signed } from '../lib/money';

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

const baseCustomer = (f) => ({
  name: f.name.trim(),
  phone: (f.phone || '').trim(),
  address: (f.address || '').trim(),
  area: (f.area || '').trim(),
});

const blobToDataUrl = (b) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [rev, setRev] = useState(0); // bumps after every change so screens refresh

  const reload = useCallback(async () => {
    setCustomers(await allCustomers());
    setRev((r) => r + 1);
  }, []);

  useEffect(() => {
    reload()
      .catch((e) => setSyncError(e.message || String(e)))
      .finally(() => setReady(true));
    // Ask the phone not to clear our data when storage is low.
    Promise.resolve(navigator.storage && navigator.storage.persist && navigator.storage.persist()).catch(() => {});
  }, [reload]);

  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const areas = useMemo(
    () =>
      [...new Set(customers.map((c) => (c.area || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [customers]
  );

  const write = async (fn) => {
    const r = await fn();
    await reload();
    return r;
  };

  // ---------- customers ----------
  const addCustomer = (f) =>
    write(async () => {
      const id = newId();
      const now = Date.now();
      const opening = f.openingBalance || 0;
      await run('customers', 'readwrite', (tx) => {
        tx.objectStore('customers').put({
          id,
          ...baseCustomer(f),
          openingBalance: opening,
          balance: opening,
          createdAt: now,
          updatedAt: now,
        });
      });
      return id;
    });

  const updateCustomer = (c, f) =>
    write(() =>
      run('customers', 'readwrite', async (tx) => {
        const s = tx.objectStore('customers');
        const cur = await req(s.get(c.id));
        if (!cur) throw new Error('Customer not found');
        const opening = f.openingBalance || 0;
        s.put({
          ...cur,
          ...baseCustomer(f),
          openingBalance: opening,
          balance: (cur.balance || 0) + opening - (cur.openingBalance || 0),
          updatedAt: Date.now(),
        });
      })
    );

  const deleteCustomer = (c) =>
    write(() =>
      run(['customers', 'transactions'], 'readwrite', async (tx) => {
        const ts = tx.objectStore('transactions');
        const keys = await req(ts.index('customerId').getAllKeys(IDBKeyRange.only(c.id)));
        keys.forEach((k) => ts.delete(k));
        tx.objectStore('customers').delete(c.id);
      })
    );

  // Rebuilds the stored balance from the ledger (safety net).
  const recalcCustomer = (c, computedBalance) =>
    write(() =>
      run('customers', 'readwrite', async (tx) => {
        const s = tx.objectStore('customers');
        const cur = await req(s.get(c.id));
        if (cur) s.put({ ...cur, balance: computedBalance, updatedAt: Date.now() });
      })
    );

  // ---------- transactions ----------
  const addTransaction = ({ customerId, type, amount, note, dateKey, ts, photoFile }) =>
    write(async () => {
      const photoBlob = photoFile ? await compressImage(photoFile) : null;
      const t = { id: newId(), customerId, type, amount, note: (note || '').trim(), dateKey, ts, createdAt: Date.now() };
      if (photoBlob) t.photoBlob = photoBlob;
      await run(['customers', 'transactions'], 'readwrite', async (tx) => {
        const cs = tx.objectStore('customers');
        const c = await req(cs.get(customerId));
        if (!c) throw new Error('Customer not found');
        tx.objectStore('transactions').put(t);
        cs.put({ ...c, balance: (c.balance || 0) + signed(t), updatedAt: Date.now() });
      });
    });

  const updateTransaction = (old, { type, amount, note, dateKey, ts, photoFile, removePhoto }) =>
    write(async () => {
      const photoBlob = photoFile ? await compressImage(photoFile) : null;
      await run(['customers', 'transactions'], 'readwrite', async (tx) => {
        const tStore = tx.objectStore('transactions');
        const cStore = tx.objectStore('customers');
        const cur = await req(tStore.get(old.id));
        if (!cur) throw new Error('Entry not found');
        const next = { ...cur, type, amount, note: (note || '').trim(), dateKey, ts, updatedAt: Date.now() };
        if (photoBlob) next.photoBlob = photoBlob;
        else if (removePhoto) delete next.photoBlob;
        tStore.put(next);
        const delta = signed(next) - signed(cur);
        if (delta !== 0) {
          const c = await req(cStore.get(cur.customerId));
          if (c) cStore.put({ ...c, balance: (c.balance || 0) + delta, updatedAt: Date.now() });
        }
      });
    });

  const deleteTransaction = (t) =>
    write(() =>
      run(['customers', 'transactions'], 'readwrite', async (tx) => {
        const tStore = tx.objectStore('transactions');
        const cStore = tx.objectStore('customers');
        const cur = await req(tStore.get(t.id));
        if (!cur) return;
        tStore.delete(t.id);
        const c = await req(cStore.get(cur.customerId));
        if (c) cStore.put({ ...c, balance: (c.balance || 0) - signed(cur), updatedAt: Date.now() });
      })
    );

  const fetchTxns = useCallback((fromKey, toKey) => txnsInRange(fromKey, toKey), []);

  // ---------- import / backup / reset ----------
  const importCustomers = (rows) =>
    write(() =>
      run('customers', 'readwrite', (tx) => {
        const s = tx.objectStore('customers');
        const now = Date.now();
        rows.forEach((f) => {
          const opening = f.openingBalance || 0;
          s.put({ id: newId(), ...baseCustomer(f), openingBalance: opening, balance: opening, createdAt: now, updatedAt: now });
        });
      })
    );

  const exportAll = async () => {
    const [cs, ts] = await Promise.all([allCustomers(), allTransactionsRaw()]);
    const transactions = [];
    for (const t of ts) {
      const { photoBlob, photoUrl, ...rest } = t;
      transactions.push(photoBlob ? { ...rest, photoData: await blobToDataUrl(photoBlob) } : rest);
    }
    return { customers: cs, transactions };
  };

  const restoreBackup = ({ customers: cs = [], transactions: ts = [] }) =>
    write(async () => {
      const prepared = [];
      for (const { photoData, ...t } of ts) {
        const row = { ...t, id: t.id || newId() };
        if (photoData) row.photoBlob = await (await fetch(photoData)).blob();
        prepared.push(row);
      }
      await run(['customers', 'transactions'], 'readwrite', (tx) => {
        cs.forEach((c) => tx.objectStore('customers').put({ ...c, id: c.id || newId() }));
        prepared.forEach((t) => tx.objectStore('transactions').put(t));
      });
    });

  const wipeAllData = () =>
    write(() =>
      run(['customers', 'transactions'], 'readwrite', (tx) => {
        tx.objectStore('customers').clear();
        tx.objectStore('transactions').clear();
      })
    );

  const value = {
    customers,
    byId,
    areas,
    ready,
    syncError,
    rev,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recalcCustomer,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    fetchTxns,
    importCustomers,
    exportAll,
    restoreBackup,
    wipeAllData,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
