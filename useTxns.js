import { useEffect, useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { txnsOfCustomer, txnsOnDay } from '../lib/db';

// Re-reads from the device database whenever data changes (rev) or the key changes.
function useQuery(fetcher, dep) {
  const { rev } = useData();
  const [state, setState] = useState({ rows: [], loading: true, error: '', rev: -1 });
  const last = useRef(dep);

  useEffect(() => {
    let alive = true;
    if (last.current !== dep) {
      last.current = dep;
      setState((s) => ({ ...s, loading: true }));
    }
    fetcher()
      .then((rows) => alive && setState({ rows, loading: false, error: '', rev }))
      .catch((e) => alive && setState({ rows: [], loading: false, error: e.message || String(e), rev }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep, rev]);

  // `fresh` is true once the rows match the latest data (avoids a flash of stale totals).
  return { ...state, fresh: state.rev === rev };
}

export const useDayTxns = (day) => useQuery(() => txnsOnDay(day), day);
export const useCustomerTxns = (customerId) => useQuery(() => txnsOfCustomer(customerId), customerId);
