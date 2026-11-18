import { useState } from 'react';
import { fmt } from '../lib/money';
import { fmtDate, fmtTime } from '../lib/dates';
import { Modal } from './ui';

export default function TxnRow({ t, customer, onClick, after, showName = true }) {
  const [showPhoto, setShowPhoto] = useState(false);
  const isU = t.type === 'udhari';
  return (
    <>
      <div onClick={onClick} className="flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-slate-50">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
            isU ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {isU ? '↑' : '↓'}
        </div>
        <div className="min-w-0 flex-1">
          {showName && (
            <p className="truncate text-sm font-semibold">
              {customer?.name || 'Unknown customer'}
              {customer?.area && <span className="ml-1 text-xs font-normal text-slate-400">· {customer.area}</span>}
            </p>
          )}
          <p className="truncate text-xs text-slate-500">
            {fmtDate(t.ts)} · {fmtTime(t.ts)}
            {t.note ? ` · ${t.note}` : ''}
          </p>
        </div>
        {t.photoUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPhoto(true);
            }}
            className="text-lg"
            aria-label="Receipt photo"
          >
            📎
          </button>
        )}
        <div className="text-right">
          <p className={`text-sm font-bold ${isU ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isU ? '+' : '−'}
            {fmt(t.amount)}
          </p>
          {after !== undefined && <p className="text-[11px] text-slate-400">Bal {fmt(after)}</p>}
        </div>
      </div>
      {showPhoto && (
        <Modal title="Receipt" onClose={() => setShowPhoto(false)}>
          <img src={t.photoUrl} alt="Receipt" className="w-full rounded-xl" />
        </Modal>
      )}
    </>
  );
}
