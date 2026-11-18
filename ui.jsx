import { useEffect } from 'react';
import { fmt } from '../lib/money';
import { back } from '../lib/router';

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-3xl leading-none text-slate-400" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ full }) {
  return (
    <div className={`flex items-center justify-center ${full ? 'min-h-screen' : 'py-10'}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}

export function Empty({ icon = '📭', text }) {
  return (
    <div className="px-6 py-14 text-center text-slate-400">
      <div className="mb-2 text-4xl">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

// Positive balance = customer owes you (baaki). Negative = customer paid extra (advance).
export function Balance({ paise = 0, big }) {
  const cls = paise > 0 ? 'text-rose-600' : paise < 0 ? 'text-emerald-600' : 'text-slate-400';
  const tag = paise > 0 ? 'baaki' : paise < 0 ? 'advance' : '';
  return (
    <span className={`font-bold ${cls} ${big ? 'text-3xl' : 'text-sm'}`}>
      {fmt(Math.abs(paise))}
      {tag && <span className="ml-1 text-[10px] font-medium uppercase">{tag}</span>}
    </span>
  );
}

export function PageHeader({ title, sub, right, showBack, children }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={back} className="-ml-1 text-2xl text-slate-500" aria-label="Back">
            ←
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{title}</h1>
          {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}

export function ErrorNote({ text }) {
  if (!text) return null;
  return <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{text}</div>;
}
