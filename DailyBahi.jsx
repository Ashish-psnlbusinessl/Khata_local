import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useDayTxns } from '../hooks/useTxns';
import { fmt, rupeesStr } from '../lib/money';
import { dateKey, fmtDate, fmtTime, shiftKey } from '../lib/dates';
import { toCSV } from '../lib/csv';
import { saveFile } from '../lib/files';
import { Empty, ErrorNote, PageHeader, Spinner } from '../components/ui';
import TxnRow from '../components/TxnRow';
import TransactionForm from '../components/TransactionForm';

const PAGE = 100;

export default function DailyBahi() {
  const { byId } = useData();
  const [day, setDay] = useState(dateKey());
  const { rows, loading, error } = useDayTxns(day);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [form, setForm] = useState(null); // {} new | { txn } edit

  useEffect(() => setLimit(PAGE), [day, tab, q]);

  const totals = useMemo(() => {
    let credit = 0,
      debit = 0,
      nc = 0,
      nd = 0;
    for (const t of rows) {
      if (t.type === 'udhari') {
        credit += t.amount;
        nc++;
      } else {
        debit += t.amount;
        nd++;
      }
    }
    return { credit, debit, nc, nd, net: credit - debit };
  }, [rows]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((t) => {
        if (tab === 'udhari' && t.type !== 'udhari') return false;
        if (tab === 'jama' && t.type !== 'jama') return false;
        if (!s) return true;
        const c = byId.get(t.customerId);
        return (
          (c?.name || '').toLowerCase().includes(s) ||
          (c?.area || '').toLowerCase().includes(s) ||
          (t.note || '').toLowerCase().includes(s)
        );
      })
      .sort((a, b) => b.ts - a.ts);
  }, [rows, tab, q, byId]);

  const exportDay = () =>
    saveFile(
      `daily-bahi-${day}.csv`,
      toCSV(
        [...rows].sort((a, b) => a.ts - b.ts),
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
      <PageHeader
        title="Daily Bahi"
        sub={fmtDate(keyMs(day))}
        right={
          <button className="btn-primary !px-3 !py-2" onClick={() => setForm({})}>
            + Entry
          </button>
        }
      >
        <div className="mt-3 flex items-center gap-2">
          <button className="btn-ghost !px-3" onClick={() => setDay(shiftKey(day, -1))} aria-label="Previous day">
            ‹
          </button>
          <input className="input" type="date" value={day} max={dateKey()} onChange={(e) => setDay(e.target.value || dateKey())} />
          <button
            className="btn-ghost !px-3"
            onClick={() => setDay(shiftKey(day, 1))}
            disabled={day >= dateKey()}
            aria-label="Next day"
          >
            ›
          </button>
          {day !== dateKey() && (
            <button className="btn-ghost !px-3" onClick={() => setDay(dateKey())}>
              Today
            </button>
          )}
        </div>
      </PageHeader>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-400">Total Udhari (Credit)</p>
            <p className="text-xl font-bold text-rose-600">{fmt(totals.credit)}</p>
            <p className="text-xs text-slate-400">{totals.nc} entries</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-400">Total Jama (Debit)</p>
            <p className="text-xl font-bold text-emerald-600">{fmt(totals.debit)}</p>
            <p className="text-xs text-slate-400">{totals.nd} entries</p>
          </div>
          <div className="card col-span-2 flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-slate-400">Net of the day (Udhari − Jama)</p>
              <p className={`text-xl font-bold ${totals.net > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(totals.net)}</p>
            </div>
            <button className="btn-ghost !py-2" onClick={exportDay} disabled={!rows.length}>
              ⬇ Export
            </button>
          </div>
        </div>

        <input className="input" placeholder="🔍 Search customer, area or remark" value={q} onChange={(e) => setQ(e.target.value)} />

        <div className="flex gap-2">
          {[
            ['all', `All (${rows.length})`],
            ['udhari', `Udhari (${totals.nc})`],
            ['jama', `Jama (${totals.nd})`],
          ].map(([k, label]) => (
            <button key={k} className={`chip ${tab === k ? 'chip-on' : ''}`} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        <ErrorNote text={error} />

        <div className="card overflow-hidden">
          {loading ? (
            <Spinner />
          ) : list.length === 0 ? (
            <Empty icon="📒" text="No entries for this day." />
          ) : (
            <div className="divide-y divide-slate-100">
              {list.slice(0, limit).map((t) => (
                <TxnRow key={t.id} t={t} customer={byId.get(t.customerId)} onClick={() => setForm({ txn: t })} />
              ))}
              {list.length > limit && (
                <button className="w-full py-3 text-sm font-semibold text-indigo-600" onClick={() => setLimit(limit + PAGE)}>
                  Show more ({list.length - limit} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {form && <TransactionForm txn={form.txn} defaultDay={day} onClose={() => setForm(null)} />}
    </>
  );
}

function keyMs(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}
