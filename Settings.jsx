import { useState } from 'react';
import { useData } from '../context/DataContext';
import { dateKey } from '../lib/dates';
import { parseCSV, toCSV } from '../lib/csv';
import { readFileText, saveFile } from '../lib/files';
import { rupeesStr, toPaise } from '../lib/money';
import { ErrorNote, PageHeader } from '../components/ui';

const pick = (o, keys) => {
  for (const k of keys) if (o[k] !== undefined && String(o[k]).trim() !== '') return String(o[k]).trim();
  return '';
};

export default function Settings() {
  const { customers, exportAll, importCustomers, restoreBackup, wipeAllData } = useData();
  const [shop, setShop] = useState(localStorage.getItem('shopName') || '');
  const [lastBackup, setLastBackup] = useState(localStorage.getItem('lastBackup') || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const run = async (fn) => {
    setErr('');
    setMsg('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const saveShop = (v) => {
    setShop(v);
    localStorage.setItem('shopName', v);
  };

  const exportCustomers = () =>
    run(async () => {
      await saveFile(
        `customers-${dateKey()}.csv`,
        toCSV(customers, [
          { label: 'Name', key: 'name' },
          { label: 'Phone', key: 'phone' },
          { label: 'Address', key: 'address' },
          { label: 'Area', key: 'area' },
          { label: 'Opening Balance', get: (c) => rupeesStr(c.openingBalance) },
          { label: 'Balance', get: (c) => rupeesStr(c.balance) },
        ])
      );
      setMsg(`Exported ${customers.length} customers.`);
    });

  const backup = () =>
    run(async () => {
      const data = await exportAll();
      const payload = { version: 1, exportedAt: new Date().toISOString(), ...data };
      await saveFile(`khata-backup-${dateKey()}.json`, JSON.stringify(payload), 'application/json');
      localStorage.setItem('lastBackup', dateKey());
      setLastBackup(dateKey());
      setMsg(`Backup ready: ${data.customers.length} customers, ${data.transactions.length} entries. Save it to Google Drive, WhatsApp or your files.`);
    });

  const onImportCsv = (file) =>
    run(async () => {
      const rows = parseCSV(await readFileText(file));
      if (rows.length < 2) throw new Error('The CSV file has no data rows.');
      const head = rows[0].map((h) => h.trim().toLowerCase());
      const objs = rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
      const list = objs
        .map((o) => {
          const bal = toPaise(pick(o, ['opening balance', 'balance', 'udhari', 'baaki']) || '0');
          return {
            name: pick(o, ['name', 'customer name', 'customer']),
            phone: pick(o, ['phone', 'mobile', 'contact', 'phone number']),
            address: pick(o, ['address']),
            area: pick(o, ['area', 'location']),
            openingBalance: Number.isFinite(bal) ? bal : 0,
          };
        })
        .filter((c) => c.name);
      if (!list.length) throw new Error('No valid rows found. The file needs a "Name" column.');
      if (!window.confirm(`Import ${list.length} customers? Existing customers are not changed.`)) return;
      await importCustomers(list);
      setMsg(`Imported ${list.length} customers (${objs.length - list.length} rows skipped).`);
    });

  const onRestore = (file) =>
    run(async () => {
      const data = JSON.parse(await readFileText(file));
      if (!Array.isArray(data.customers) || !Array.isArray(data.transactions)) throw new Error('Not a valid Khata backup file.');
      if (!window.confirm(`Restore ${data.customers.length} customers and ${data.transactions.length} entries? Matching records will be overwritten.`)) return;
      await restoreBackup(data);
      setMsg('Backup restored.');
    });

  const wipe = () =>
    run(async () => {
      if (!window.confirm('Delete ALL customers, entries and photos from this device? This cannot be undone.')) return;
      if (!window.confirm('Are you really sure? Make sure you have a backup.')) return;
      await wipeAllData();
      setMsg('All data deleted from this device.');
    });

  return (
    <>
      <PageHeader title="Settings" sub="Your data is saved on this device" />
      <div className="space-y-4 p-4">
        <section className="card space-y-2 border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-bold text-amber-900">⚠ Keep a backup</h2>
          <p className="text-xs text-amber-800">
            Data lives only on this phone. If you uninstall the app, clear its data or lose the phone, it is gone. Make a backup regularly and
            save it to Google Drive or WhatsApp.
          </p>
          <p className="text-xs font-semibold text-amber-900">Last backup: {lastBackup || 'never'}</p>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-bold">Shop</h2>
          <div>
            <label className="label">Shop name (used in WhatsApp / SMS reminders)</label>
            <input className="input" value={shop} onChange={(e) => saveShop(e.target.value)} placeholder="e.g. Sharma General Store" />
          </div>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-bold">Backup & export</h2>
          <button className="btn-primary w-full" onClick={backup} disabled={busy}>
            ⬇ Full backup (all customers, entries, photos)
          </button>
          <button className="btn-ghost w-full" onClick={exportCustomers} disabled={busy}>
            ⬇ Customers list (CSV / Excel)
          </button>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-bold">Import</h2>
          <label className="btn-ghost w-full cursor-pointer">
            ⬆ Restore from backup (JSON)
            <input type="file" accept=".json,application/json" className="hidden" disabled={busy} onChange={(e) => e.target.files[0] && onRestore(e.target.files[0])} />
          </label>
          <label className="btn-ghost w-full cursor-pointer">
            ⬆ Import customers from CSV
            <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy} onChange={(e) => e.target.files[0] && onImportCsv(e.target.files[0])} />
          </label>
          <p className="text-xs text-slate-400">CSV columns: Name, Phone, Address, Area, Opening Balance (column names are not case-sensitive).</p>
        </section>

        {busy && <p className="text-center text-sm text-slate-500">Working… please keep the app open.</p>}
        {msg && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}
        <ErrorNote text={err} />

        <button className="w-full py-2 text-sm font-semibold text-rose-600" onClick={wipe} disabled={busy}>
          Delete all data from this device
        </button>
        <p className="pb-4 text-center text-xs text-slate-400">Khata Book v1.0 · {customers.length} customers</p>
      </div>
    </>
  );
}
