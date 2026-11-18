import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/money';
import { go } from '../lib/router';
import { Balance, Empty, PageHeader, Spinner } from '../components/ui';
import CustomerForm from '../components/CustomerForm';

const PAGE = 100; // render in pages so 5000+ customers stay fast on low-end phones

export default function Customers() {
  const { customers, areas, ready, syncError } = useData();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [grouped, setGrouped] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [adding, setAdding] = useState(false);

  useEffect(() => setLimit(PAGE), [q, area, grouped, dueOnly]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return customers
      .filter(
        (c) =>
          (!area || (c.area || '') === area) &&
          (!dueOnly || (c.balance || 0) > 0) &&
          (!s ||
            (c.name || '').toLowerCase().includes(s) ||
            (c.area || '').toLowerCase().includes(s) ||
            (c.phone || '').includes(s))
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [customers, q, area, dueOnly]);

  const totalDue = useMemo(() => filtered.reduce((s, c) => s + Math.max(c.balance || 0, 0), 0), [filtered]);

  const rows = useMemo(() => {
    if (!grouped) return filtered.map((c) => ({ k: c.id, c }));
    const g = new Map();
    for (const c of filtered) {
      const a = (c.area || '').trim() || 'No area';
      if (!g.has(a)) g.set(a, []);
      g.get(a).push(c);
    }
    const out = [];
    [...g.keys()]
      .sort((a, b) => a.localeCompare(b))
      .forEach((a) => {
        const list = g.get(a);
        out.push({
          k: 'h-' + a,
          h: a,
          count: list.length,
          sum: list.reduce((s, c) => s + Math.max(c.balance || 0, 0), 0),
        });
        list.forEach((c) => out.push({ k: c.id, c }));
      });
    return out;
  }, [filtered, grouped]);

  return (
    <>
      <PageHeader
        title="Customers"
        sub={`${filtered.length} customers · to receive ${fmt(totalDue)}`}
        right={
          <button className="btn-primary !px-3 !py-2" onClick={() => setAdding(true)}>
            + Add
          </button>
        }
      >
        <input
          className="input mt-3"
          placeholder="🔍 Search name, area or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          <button className={`chip ${grouped ? 'chip-on' : ''}`} onClick={() => setGrouped(!grouped)}>
            Group by area
          </button>
          <button className={`chip ${dueOnly ? 'chip-on' : ''}`} onClick={() => setDueOnly(!dueOnly)}>
            Baaki only
          </button>
          <button className={`chip ${!area ? 'chip-on' : ''}`} onClick={() => setArea('')}>
            All areas
          </button>
          {areas.map((a) => (
            <button key={a} className={`chip ${area === a ? 'chip-on' : ''}`} onClick={() => setArea(area === a ? '' : a)}>
              {a}
            </button>
          ))}
        </div>
      </PageHeader>

      {syncError && <p className="m-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Sync problem: {syncError}</p>}

      {!ready ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty icon="👥" text={customers.length ? 'No customers match your search.' : 'No customers yet. Tap “+ Add” to create the first one.'} />
      ) : (
        <div className="m-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {rows.slice(0, limit).map((r) =>
            r.h ? (
              <div key={r.k} className="flex items-center justify-between bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700">
                <span>
                  📍 {r.h} · {r.count}
                </span>
                <span>{fmt(r.sum)} baaki</span>
              </div>
            ) : (
              <button
                key={r.k}
                onClick={() => go(`customers/${r.c.id}`)}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 active:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {(r.c.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.c.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[r.c.area, r.c.phone].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <Balance paise={r.c.balance || 0} />
              </button>
            )
          )}
          {rows.length > limit && (
            <button className="w-full py-3 text-sm font-semibold text-indigo-600" onClick={() => setLimit(limit + PAGE)}>
              Show more ({rows.length - limit} remaining)
            </button>
          )}
        </div>
      )}

      {adding && <CustomerForm onClose={() => setAdding(false)} onSaved={(id) => go(`customers/${id}`)} />}
    </>
  );
}
