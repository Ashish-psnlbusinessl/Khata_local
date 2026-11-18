import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { fmt, rupeesStr } from '../lib/money';
import { dateKey, fmtTime, monthStartKey, shiftKey } from '../lib/dates';
import { toCSV } from '../lib/csv';
import { saveFile } from '../lib/files';
import { Empty, ErrorNote, PageHeader, Spinner } from '../components/ui';
import TxnRow from '../components/TxnRow';
import TransactionForm from '../components/TransactionForm';

const PAGE = 100;

const presets = [
  ['Today', () => [dateKey(), dateKey()]],
  ['Yesterday', () => [shiftKey(dateKey(), -1), shiftKey(dateKey(), -1)]],
  ['Last 7 days', () => [shiftKey(dateKey(), -6), dateKey()]],
  ['This month', () => [monthStartKey(), dateKey()]],
];

export default function History() {
  const { byId, fetchTxns } = useData();
  const [from, setFrom] = useState(dateKey());
  const [to, setTo] = useState(dateKey());
  const [preset, setPreset] = useState('Today');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    if (from > to) return setErr('"From" date is after "To" date');
    setErr('');
    setLoading(true);
    try {
      setRows(await fetchTxns(from, to));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, fetchTxns]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setLimit(PAGE), [type, q, from, to]);

  const applyPreset = ([name, fn]) => {
    const [f, t] = fn();
    setPreset(name);
    setFrom(f);
    setTo(t);
  };

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((t) => {
        if (type !== 'all' && t.type !== type) return false;
        if (!s) return true;
        const c = byId.get(t.customerId);
        return (c?.name || '').toLowerCase().includes(s) || (c?.area || '').toLowerCase().includes(s) || (t.note || '').toLowerCase().includes(s);
      })
      .sort((a, b) => b.ts - a.ts);
  }, [rows, type, q, byId]);

  const totals = useMemo(() => {
    let credit = 0,
      debit = 0;
    for (const t of list) t.type === 'udhari' ? (credit += t.amount) : (debit += t.amount);
    return { credit, debit };
  }, [list]);

  const exportCsv = () =>
    saveFile(
      `transactions-${from}_to_${to}.csv`,
      toCSV(
        [...list].sort((a, b) => a.ts - b.ts),
        [
          { label: 'Date', get: (t) => t.dateKey },
          { label: 'Time', get: (t) => fmtTime(t.ts) },
          { label: 'Customer', get: (t) => byId.get(t.customerId)?.name || '' },
          { label: 'Area', get: (t) => byId.get(t.customerId)?.area || '' },
          { label: 'Type', get: (t) => (t.type === 'udhari' ? 'Udhari (Credit)' : 'Jama (Debit)') },
          { label: 'Amount', get: (t) => rupeesStr(t.amount) },
          { label: 'Note', key: 'note' },
        ]
      )
    );

  return (
    <>
      <PageHeader title="History" sub="Search & filter all entries by date range">
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {presets.map((p) => (
            <button key={p[0]} className={`chip ${preset === p[0] ? 'chip-on' : ''}`} onClick={() => applyPreset(p)}>
              {p[0]}
            </button>
          ))}
          <button className={`chip ${preset === 'Custom' ? 'chip-on' : ''}`} onClick={() => setPreset('Custom')}>
            Custom
          </button>
        </div>
        {preset === 'Custom' && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="label">From</label>
              <input className="input" type="date" value={from} max={dateKey()} onChange={(e) => setFrom(e.target.value || from)} />
            </div>
            <div>
              <label className="label">To</label>
              <input className="input" type="date" value={to} max={dateKey()} onChange={(e) => setTo(e.target.value || to)} />
            </div>
          </div>
        )}
      </PageHeader>

      <div className="space-y-4 p-4">
        <input className="input" placeholder="🔍 Customer name, area or remark" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2">
          {[
            ['all', 'All'],
            ['udhari', 'Udhari'],
            ['jama', 'Jama'],
          ].map(([k, l]) => (
            <button key={k} className={`chip ${type === k ? 'chip-on' : ''}`} onClick={() => setType(k)}>
              {l}
            </button>
          ))}
          <button className="chip ml-auto" onClick={load}>
            ↻ Refresh
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="card p-3">
            <p className="text-[11px] text-slate-400">Udhari</p>
            <p className="text-sm font-bold text-rose-600">{fmt(totals.credit)}</p>
          </div>
          <div className="card p-3">
            <p className="text-[11px] text-slate-400">Jama</p>
            <p className="text-sm font-bold text-emerald-600">{fmt(totals.debit)}</p>
          </div>
          <div className="card p-3">
            <p className="text-[11px] text-slate-400">Entries</p>
            <p className="text-sm font-bold">{list.length}</p>
          </div>
        </div>

        <ErrorNote text={err} />

        <div className="card overflow-hidden">
          {loading ? (
            <Spinner />
          ) : list.length === 0 ? (
            <Empty icon="🧾" text="No entries found for these filters." />
          ) : (
            <div className="divide-y divide-slate-100">
              {list.slice(0, limit).map((t) => (
                <TxnRow key={t.id} t={t} customer={byId.get(t.customerId)} onClick={() => setEdit(t)} />
              ))}
              {list.length > limit && (
                <button className="w-full py-3 text-sm font-semibold text-indigo-600" onClick={() => setLimit(limit + PAGE)}>
                  Show more ({list.length - limit} remaining)
                </button>
              )}
            </div>
          )}
        </div>

        <button className="btn-ghost w-full" onClick={exportCsv} disabled={!list.length}>
          ⬇ Export these entries (CSV / Excel)
        </button>
      </div>

      {edit && (
        <TransactionForm
          txn={edit}
          onClose={() => {
            setEdit(null);
            load();
          }}
        />
      )}
    </>
  );
}
