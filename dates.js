const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' in the device's local time. Used for day grouping and range filters.
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const keyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const shiftKey = (key, days) => {
  const d = keyToDate(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
};

export const tsForDay = (key) =>
  key === dateKey() ? Date.now() : new Date(keyToDate(key).setHours(12, 0, 0, 0)).getTime();

export const fmtDate = (ms) =>
  new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const fmtTime = (ms) =>
  new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const monthStartKey = () => {
  const n = new Date();
  return dateKey(new Date(n.getFullYear(), n.getMonth(), 1));
};
