import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { loadRazorpay, rupee } from '../utils.js';

export default function Checkout() {
  const { items, setQty, remove, clear, count } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Server prices the cart and checks stock, so the summary always reflects what will be charged
  useEffect(() => {
    if (!items.length) {
      setQuote(null);
      setError('');
      return;
    }
    let live = true;
    api
      .post('/orders/quote', { items })
      .then((r) => live && (setQuote(r.data), setError('')))
      .catch((e) => live && (setQuote(null), setError(errMsg(e))));
    return () => {
      live = false;
    };
  }, [items]);

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      if (!(await loadRazorpay())) throw new Error('Could not load Razorpay. Check your connection and try again.');
      const { data: o } = await api.post('/orders/create', { items });
      const rzp = new window.Razorpay({
        key: o.keyId,
        amount: o.amount,
        currency: o.currency,
        name: 'Oasis Pizza',
        description: `${count} pizza${count > 1 ? 's' : ''}`,
        order_id: o.razorpayOrderId,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#173A2A' },
        handler: async (resp) => {
          try {
            await api.post('/orders/verify', resp);
            clear();
            nav('/?placed=1');
          } catch (e) {
            setError(errMsg(e));
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on('payment.failed', (r) => {
        setError(r.error?.description || 'The payment failed. You have not been charged.');
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  };

  if (!items.length) {
    return (
      <div className="empty">
        <h2>Your cart is empty</h2>
        <p className="muted">Pick a ready-made pizza or build one from scratch.</p>
        <Link className="btn primary" to="/">Browse the menu</Link>
      </div>
    );
  }

  return (
    <>
      <h2>Order summary</h2>
      <div className="stack">
        {items.map((it, idx) => {
          const line = quote?.lines?.[idx];
          return (
            <article key={it.key} className="order">
              <div className="order-head">
                <strong>{it.name}</strong>
                <strong>{line ? rupee(line.unitPrice * it.qty) : ''}</strong>
              </div>
              {line && (
                <p className="muted small">
                  {[line.ingredients.base, line.ingredients.sauce, line.ingredients.cheese, ...line.ingredients.veggies].join(', ')}
                </p>
              )}
              <div className="qty">
                <button className="btn ghost" aria-label="Decrease quantity" onClick={() => setQty(it.key, it.qty - 1)}>-</button>
                <span>{it.qty}</span>
                <button className="btn ghost" aria-label="Increase quantity" onClick={() => setQty(it.key, it.qty + 1)}>+</button>
                {line && <span className="muted small">{rupee(line.unitPrice)} each</span>}
                <button className="link danger" onClick={() => remove(it.key)}>Remove</button>
              </div>
            </article>
          );
        })}
      </div>

      {error && (
        <p className="note err">
          {error} <button className="link" onClick={clear}>Clear cart</button>
        </p>
      )}

      <div className="total">
        <span>Total</span>
        <strong>{quote ? rupee(quote.amount) : '...'}</strong>
      </div>
      <button className="btn primary block" disabled={!quote || busy} onClick={pay}>
        {busy ? 'Opening payment...' : `Pay ${quote ? rupee(quote.amount) : ''} with Razorpay`}
      </button>
      <p className="muted small center">Test mode: choose Netbanking or Wallet, then click "Success" on the mock page.</p>
    </>
  );
}
