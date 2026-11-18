import { useState } from 'react';
import { Modal, ErrorNote } from './ui';
import { useData } from '../context/DataContext';
import { rupeesStr, toPaise } from '../lib/money';

export default function CustomerForm({ customer, onClose, onSaved }) {
  const { areas, addCustomer, updateCustomer } = useData();
  const [f, setF] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    area: customer?.area || '',
    opening: customer?.openingBalance ? rupeesStr(customer.openingBalance) : '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.name.trim()) return setErr('Customer name is required');
    const opening = f.opening.trim() === '' ? 0 : toPaise(f.opening);
    if (!Number.isFinite(opening)) return setErr('Opening balance is not a valid number');
    setBusy(true);
    try {
      const data = { ...f, openingBalance: opening };
      if (customer) await updateCustomer(customer, data);
      else {
        const id = await addCustomer(data);
        onSaved?.(id);
      }
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={customer ? 'Edit customer' : 'New customer'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Name *</label>
          <input className="input" value={f.name} onChange={set('name')} autoFocus />
        </div>
        <div>
          <label className="label">Mobile number</label>
          <input className="input" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="10-digit number" />
        </div>
        <div>
          <label className="label">Area / Location</label>
          <input className="input" list="area-list" value={f.area} onChange={set('area')} placeholder="e.g. Gandhi Nagar" />
          <datalist id="area-list">
            {areas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">Address</label>
          <textarea className="input" rows={2} value={f.address} onChange={set('address')} />
        </div>
        <div>
          <label className="label">Opening balance (₹ already pending from this customer)</label>
          <input className="input" inputMode="decimal" value={f.opening} onChange={set('opening')} placeholder="0" />
        </div>
        <ErrorNote text={err} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Save customer'}
        </button>
      </form>
    </Modal>
  );
}
