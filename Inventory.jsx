import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import { usePolling } from '../../utils.js';

const GROUPS = [
  ['base', 'Pizza bases'],
  ['sauce', 'Sauces'],
  ['cheese', 'Cheeses'],
  ['veggie', 'Vegetables'],
];

function Row({ item, onSaved, onError }) {
  const [stock, setStock] = useState(item.stock);
  const [threshold, setThreshold] = useState(item.threshold);
  const [price, setPrice] = useState(item.price);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStock(item.stock);
    setThreshold(item.threshold);
    setPrice(item.price);
  }, [item.stock, item.threshold, item.price]);

  const dirty = Number(stock) !== item.stock || Number(threshold) !== item.threshold || Number(price) !== item.price;
  const low = item.stock < item.threshold;

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/inventory/${item._id}`, {
        stock: Number(stock),
        threshold: Number(threshold),
        price: Number(price),
      });
      onSaved(data);
    } catch (e) {
      onError(errMsg(e));
    }
    setBusy(false);
  };

  const num = (setter) => (e) => setter(e.target.value);
  return (
    <tr className={low ? 'low' : ''}>
      <td>{item.name}{low && <span className="tag">Low</span>}</td>
      <td><input type="number" min="0" aria-label={`${item.name} stock`} value={stock} onChange={num(setStock)} /></td>
      <td><input type="number" min="0" aria-label={`${item.name} alert threshold`} value={threshold} onChange={num(setThreshold)} /></td>
      <td><input type="number" min="0" aria-label={`${item.name} price`} value={price} onChange={num(setPrice)} /></td>
      <td><button className="btn primary small" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving' : 'Save'}</button></td>
    </tr>
  );
}

export default function Inventory() {
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  usePolling(async () => {
    try {
      const { data } = await api.get('/admin/inventory');
      setItems(data);
    } catch (e) {
      setMsg({ type: 'err', text: errMsg(e) });
    }
  }, 15000);

  const onSaved = (updated) => {
    setItems((list) => list.map((i) => (i._id === updated._id ? updated : i)));
    setMsg({ type: 'ok', text: `${updated.name} updated` });
  };

  const runCheck = async () => {
    try {
      const { data } = await api.post('/admin/stock-check');
      setMsg({
        type: 'ok',
        text: data.alerted
          ? `Alert email sent for ${data.alerted} item(s).`
          : 'Everything is above its minimum level, so no email was sent.',
      });
    } catch (e) {
      setMsg({ type: 'err', text: errMsg(e) });
    }
  };

  if (!items) return <p className="muted">Loading inventory...</p>;
  const lowCount = items.filter((i) => i.stock < i.threshold).length;

  return (
    <>
      <div className="section-head">
        <div>
          <h2>Inventory</h2>
          <p className="muted">
            {lowCount ? `${lowCount} item${lowCount > 1 ? 's' : ''} below the alert threshold.` : 'All items are above their alert thresholds.'}
            {' '}Stock drops automatically when an order is paid.
          </p>
        </div>
        <button className="btn ghost" onClick={runCheck}>Run low-stock check now</button>
      </div>
      {msg.text && <p className={`note ${msg.type}`} role="status">{msg.text}</p>}

      {GROUPS.map(([cat, title]) => (
        <section key={cat}>
          <h3>{title}</h3>
          <div className="table-wrap">
            <table className="inv">
              <thead>
                <tr><th>Item</th><th>In stock</th><th>Alert below</th><th>Price (INR)</th><th /></tr>
              </thead>
              <tbody>
                {items.filter((i) => i.category === cat).map((i) => (
                  <Row key={i._id} item={i} onSaved={onSaved} onError={(t) => setMsg({ type: 'err', text: t })} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
