import { useMemo, useState } from 'react';
import { Modal, ErrorNote } from './ui';
import { useData } from '../context/DataContext';
import { toPaise, rupeesStr } from '../lib/money';
import { dateKey, tsForDay } from '../lib/dates';

// Use as: <TransactionForm customer={c} defaultType="udhari" />   (fixed customer)
//         <TransactionForm />                                       (pick a customer)
//         <TransactionForm txn={t} />                               (edit / delete)
export default function TransactionForm({ customer: fixed, txn, defaultType = 'udhari', defaultDay, onClose }) {
  const { customers, byId, addTransaction, updateTransaction, deleteTransaction } = useData();
  const [customerId, setCustomerId] = useState(fixed?.id || txn?.customerId || '');
  const [q, setQ] = useState('');
  const [type, setType] = useState(txn?.type || defaultType);
  const [amount, setAmount] = useState(txn ? rupeesStr(txn.amount) : '');
  const [note, setNote] = useState(txn?.note || '');
  const [day, setDay] = useState(txn?.dateKey || defaultDay || dateKey());
  const [file, setFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const chosen = byId.get(customerId);
  const canPick = !fixed && !txn;

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return customers
      .filter(
        (c) =>
          (c.name || '').toLowerCase().includes(s) ||
          (c.area || '').toLowerCase().includes(s) ||
          (c.phone || '').includes(s)
      )
      .slice(0, 6);
  }, [q, customers]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const paise = toPaise(amount);
    if (!customerId) return setErr('Please select a customer');
    if (!Number.isFinite(paise) || paise <= 0) return setErr('Enter a valid amount greater than 0');
    if (paise > 99999999999) return setErr('Amount is too large');
    const ts = txn && txn.dateKey === day ? txn.ts : tsForDay(day);
    setBusy(true);
    try {
      const data = { customerId, type, amount: paise, note, dateKey: day, ts, photoFile: file };
      if (txn) await updateTransaction(txn, { ...data, removePhoto });
      else await addTransaction(data);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this entry? The customer balance will be adjusted.')) return;
    setBusy(true);
    try {
      await deleteTransaction(txn);
      onClose();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  };

  const showOldPhoto = txn?.photoUrl && !removePhoto && !file;

  return (
    <Modal title={txn ? 'Edit entry' : 'New entry'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {canPick && !chosen && (
          <div>
            <label className="label">Customer</label>
            <input
              className="input"
              placeholder="Search name, area or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            {matches.length > 0 && (
              <div className="mt-1 overflow-hidden rounded-xl border border-slate-200">
                {matches.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCustomerId(c.id)}
                    className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
                  >
                    {c.name}
                    <span className="ml-1 text-xs text-slate-400">{c.area}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {chosen && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold">{chosen.name}</p>
              <p className="text-xs text-slate-500">{chosen.area}</p>
            </div>
            {canPick && (
              <button type="button" className="text-xs font-semibold text-indigo-600" onClick={() => setCustomerId('')}>
                Change
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('udhari')}
            className={type === 'udhari' ? 'btn-red' : 'btn-ghost'}
          >
            ↑ Udhari (Credit)
          </button>
          <button
            type="button"
            onClick={() => setType('jama')}
            className={type === 'jama' ? 'btn-green' : 'btn-ghost'}
          >
            ↓ Jama (Debit)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Amount (₹)</label>
            <input
              className="input text-lg font-semibold"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={day} max={dateKey()} onChange={(e) => setDay(e.target.value || dateKey())} />
          </div>
        </div>

        <div>
          <label className="label">Description / remark</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rice 5kg, Oil 1L" />
        </div>

        <div>
          <label className="label">Receipt / photo (optional)</label>
          <div className="flex gap-2">
            <label className="btn-ghost flex-1 cursor-pointer">
              📷 Camera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files[0] && (setFile(e.target.files[0]), setRemovePhoto(false))}
              />
            </label>
            <label className="btn-ghost flex-1 cursor-pointer">
              🖼️ Gallery
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files[0] && (setFile(e.target.files[0]), setRemovePhoto(false))}
              />
            </label>
          </div>
          {(preview || showOldPhoto) && (
            <div className="mt-2 flex items-center gap-3">
              <img src={preview || txn.photoUrl} alt="Receipt" className="h-20 w-20 rounded-xl object-cover" />
              <button
                type="button"
                className="text-xs font-semibold text-rose-600"
                onClick={() => (file ? setFile(null) : setRemovePhoto(true))}
              >
                Remove photo
              </button>
            </div>
          )}
        </div>

        <ErrorNote text={err} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Saving…' : txn ? 'Update entry' : 'Save entry'}
        </button>
        {txn && (
          <button type="button" className="btn-ghost w-full !text-rose-600" onClick={remove} disabled={busy}>
            Delete entry
          </button>
        )}
      </form>
    </Modal>
  );
}
