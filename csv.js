const guard = (s) => (/^[=@]/.test(s) ? "'" + s : s);

const esc = (v) => {
  const s = guard(v == null ? '' : String(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// cols: [{ label, key } | { label, get: (row) => value }]
export function toCSV(rows, cols) {
  const head = cols.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) =>
    cols.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(',')
  );
  return [head, ...body].join('\r\n');
}

export function parseCSV(text) {
  const s = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      rows.push(row);
      row = [];
    } else cur += ch;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ''));
}
