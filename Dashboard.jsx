import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import PizzaArt from '../components/PizzaArt.jsx';
import StatusTracker from '../components/StatusTracker.jsx';
import { rupee, usePolling } from '../utils.js';

export default function Dashboard() {
  const { add } = useCart();
  const [params, setParams] = useSearchParams();
  const [pizzas, setPizzas] = useState(null);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');

  // Live order status: refreshed every 5 seconds
  usePolling(async () => {
    try {
      const { data } = await api.get('/orders/mine');
      setOrders(data);
    } catch {
      /* keep the last known state */
    }
  }, 5000);

  usePolling(async () => {
    try {
      const { data } = await api.get('/menu/pizzas');
      setPizzas(data);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, 30000);

  const addPizza = (p) => {
    add({ name: p.name, base: p.base.id, sauce: p.sauce.id, cheese: p.cheese.id, veggies: p.veggies.map((v) => v.id) });
    setAdded(p.name);
    setTimeout(() => setAdded(''), 1800);
  };

  return (
    <>
      {params.get('placed') && (
        <div className="banner ok" role="status">
          Payment received. Your order is in the queue.
          <button className="link" onClick={() => setParams({})}>Dismiss</button>
        </div>
      )}

      <section>
        <h2>Your orders</h2>
        {orders === null ? (
          <p className="muted">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="muted">No orders yet. Pick a pizza below or <Link to="/build">build your own</Link>.</p>
        ) : (
          <div className="stack">
            {orders.map((o) => (
              <article key={o._id} className="order">
                <div className="order-head">
                  <div>
                    <strong>Order #{o._id.slice(-6).toUpperCase()}</strong>
                    <span className="muted"> {new Date(o.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <strong>{rupee(o.amount)}</strong>
                </div>
                <StatusTracker status={o.status} />
                <p className="muted small">{o.items.map((i) => `${i.qty} x ${i.name}`).join(', ')}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>Our pizzas</h2>
          <Link className="btn ghost" to="/build">Build your own</Link>
        </div>
        {error && <p className="note err">{error}</p>}
        {pizzas === null && !error && <p className="muted">Loading menu...</p>}
        <div className="grid">
          {pizzas?.map((p) => (
            <article key={p.id} className="card pizza-card">
              <PizzaArt base={p.base.name} sauce={p.sauce.name} cheese={p.cheese.name} veggies={p.veggies.map((v) => v.name)} />
              <h3>{p.name}</h3>
              <p className="muted small">{p.description}</p>
              <p className="small">{[p.base.name, p.sauce.name, p.cheese.name].join(', ')}</p>
              <div className="card-foot">
                <strong>{rupee(p.price)}</strong>
                <button className="btn primary" disabled={!p.available} onClick={() => addPizza(p)}>
                  {!p.available ? 'Sold out' : added === p.name ? 'Added' : 'Add to cart'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
