// All money is stored as integer paise (1 rupee = 100 paise) so there are no floating-point errors.

export const toPaise = (value) => {
  const n = Number(String(value ?? '').replace(/[,₹\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

export const rupeesStr = (paise) => ((paise || 0) / 100).toFixed(2);

export const fmt = (paise = 0) => {
  const neg = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const p = abs % 100;
  const body = rupees.toLocaleString('en-IN');
  return `${neg ? '-' : ''}₹${body}${p ? '.' + String(p).padStart(2, '0') : ''}`;
};

// udhari (credit given) increases what the customer owes; jama (payment received) reduces it.
export const signed = (t) => (t.type === 'udhari' ? t.amount : -t.amount);
