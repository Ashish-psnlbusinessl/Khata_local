import { go } from '../lib/router';

const tabs = [
  ['customers', '👥', 'Customers'],
  ['bahi', '📒', 'Daily Bahi'],
  ['history', '🧾', 'History'],
  ['settings', '⚙️', 'Settings'],
];

export default function Layout({ route, children }) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col bg-slate-50">
      <main className="flex-1 overflow-y-auto pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl">
          {tabs.map(([key, icon, label]) => {
            const on = route.name === key;
            return (
              <button
                key={key}
                onClick={() => go(key)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  on ? 'text-indigo-600' : 'text-slate-400'
                }`}
              >
                <span className="text-xl leading-none">{icon}</span>
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
