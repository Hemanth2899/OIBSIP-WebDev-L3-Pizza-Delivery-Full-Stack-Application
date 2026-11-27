import { useState } from 'react';
import api, { errMsg } from '../../api.js';
import StatusTracker from '../../components/StatusTracker.jsx';
import { STATUSES, rupee, usePolling } from '../../utils.js';

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('open');

  usePolling(async () => {
    try {
      const { data } = await api.get('/admin/orders');
      setOrders(data);
    } catch (e) {
      setError(errMsg(e));
    }
  }, 5000);

  const setStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/admin/orders/${id}/status`, { status });
      setOrders((list) => list.map((o) => (o._id === id ? data : o)));
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (!orders) return <p className="muted">{error || 'Loading orders...'}</p>;
  const shown = orders.filter((o) => (filter === 'open' ? o.status !== 'Sent to Delivery' : filter === 'sent' ? o.status === 'Sent to Delivery' : true));

  return (
    <>
      <div className="section-head">
        <h2>Orders</h2>
        <div className="seg" role="tablist">
          {[['open', 'In progress'], ['sent', 'Sent to delivery'], ['all', 'All']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>
      {error && <p className="note err">{error}</p>}
      {shown.length === 0 && <p className="muted">No orders here right now. New paid orders appear automatically.</p>}
      <div className="stack">
        {shown.map((o) => (
          <article key={o._id} className="order">
            <div className="order-head">
              <div>
                <strong>#{o._id.slice(-6).toUpperCase()}</strong>{' '}
                <span className="muted">{o.user?.name} ({o.user?.email}) - {new Date(o.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <strong>{rupee(o.amount)}</strong>
            </div>
            <ul className="lines">
              {o.items.map((i, idx) => (
                <li key={idx}>
                  <strong>{i.qty} x {i.name}</strong>
                  <span className="muted small"> {[i.ingredients.base, i.ingredients.sauce, i.ingredients.cheese, ...i.ingredients.veggies].join(', ')}</span>
                </li>
              ))}
            </ul>
            <StatusTracker status={o.status} />
            <label className="status-pick">
              <span>Update status</span>
              <select value={o.status} onChange={(e) => setStatus(o._id, e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </article>
        ))}
      </div>
    </>
  );
}
