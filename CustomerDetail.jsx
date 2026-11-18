import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useCustomerTxns } from '../hooks/useTxns';
import { fmt } from '../lib/money';
import { back } from '../lib/router';
import { hasPhone, reminderText, smsLink, telLink, waLink } from '../lib/contact';
import { Balance, Empty, PageHeader, Spinner } from '../components/ui';
import TxnRow from '../components/TxnRow';
import TransactionForm from '../components/TransactionForm';
import CustomerForm from '../components/CustomerForm';

export default function CustomerDetail({ id }) {
  const { byId, deleteCustomer, recalcCustomer, ready } = useData();
  const c = byId.get(id);
  const { rows, loading, fresh } = useCustomerTxns(id);
  const [form, setForm] = useState(null); // { type } for new, { txn } for edit
  const [editing, setEditing] = useState(false);

  // Running balance: opening balance + every entry in date order. Computed in integer paise.
  const ledger = useMemo(() => {
    if (!c) return { list: [], computed: 0 };
    const asc = [...rows].sort((a, b) => a.ts - b.ts || (a.createdAt || 0) - (b.createdAt || 0));
    let bal = c.openingBalance || 0;
    const list = asc.map((t) => {
      bal += t.type === 'udhari' ? t.amount : -t.amount;
      return { ...t, after: bal };
    });
    return { list: list.reverse(), computed: bal };
  }, [rows, c]);

  if (!ready) return <Spinner />;
  if (!c) {
    return (
      <>
        <PageHeader title="Customer" showBack />
        <Empty icon="🔎" text="Customer not found." />
      </>
    );
  }

  const balance = c.balance || 0;
  const mismatch = !loading && fresh && ledger.computed !== balance;
  const msg = reminderText(c.name, balance);
  const canRemind = hasPhone(c.phone);

  const del = async () => {
    if (!window.confirm(`Delete ${c.name} and ALL their entries? This cannot be undone.`)) return;
    await deleteCustomer(c);
    back();
  };

  return (
    <>
      <PageHeader
        title={c.name}
        sub={[c.area, c.phone].filter(Boolean).join(' · ')}
        showBack
        right={
          <button className="btn-ghost !px-3 !py-2" onClick={() => setEditing(true)}>
            ✏️ Edit
          </button>
        }
      />

      <div className="space-y-4 p-4">
        <div className="card p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {balance < 0 ? 'Customer advance' : 'Pending (baaki)'}
          </p>
          <Balance paise={balance} big />
          {c.address && <p className="mt-2 text-xs text-slate-500">📍 {c.address}</p>}
        </div>

        {mismatch && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Stored balance ({fmt(balance)}) differs from the ledger total ({fmt(ledger.computed)}).
            <button className="ml-2 font-bold underline" onClick={() => recalcCustomer(c, ledger.computed)}>
              Fix balance
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button className="btn-red" onClick={() => setForm({ type: 'udhari' })}>
            ↑ Udhari diya
          </button>
          <button className="btn-green" onClick={() => setForm({ type: 'jama' })}>
            ↓ Payment mila
          </button>
        </div>

        {canRemind && (
          <div className="grid grid-cols-3 gap-2">
            <a className="btn-ghost" href={telLink(c.phone)}>
              📞 Call
            </a>
            <a className="btn-ghost" href={waLink(c.phone, msg)} target="_blank" rel="noreferrer">
              💬 WhatsApp
            </a>
            <a className="btn-ghost" href={smsLink(c.phone, msg)}>
              ✉️ SMS
            </a>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold">Ledger</h2>
            <span className="text-xs text-slate-400">{rows.length} entries</span>
          </div>
          {loading ? (
            <Spinner />
          ) : ledger.list.length === 0 ? (
            <Empty icon="🧾" text="No entries yet." />
          ) : (
            <div className="divide-y divide-slate-100">
              {ledger.list.map((t) => (
                <TxnRow key={t.id} t={t} customer={c} showName={false} after={t.after} onClick={() => setForm({ txn: t })} />
              ))}
              {(c.openingBalance || 0) !== 0 && (
                <div className="flex justify-between px-4 py-3 text-xs text-slate-500">
                  <span>Opening balance</span>
                  <span className="font-semibold">{fmt(c.openingBalance)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="w-full py-2 text-sm font-semibold text-rose-600" onClick={del}>
          Delete this customer
        </button>
      </div>

      {form && <TransactionForm customer={c} txn={form.txn} defaultType={form.type} onClose={() => setForm(null)} />}
      {editing && <CustomerForm customer={c} onClose={() => setEditing(false)} />}
    </>
  );
}
