import { createContext, useContext, useEffect, useState } from 'react';

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

const signature = (i) => [i.base, i.sauce, i.cheese, [...i.veggies].sort().join(',')].join('|');

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pizza_cart')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('pizza_cart', JSON.stringify(items));
  }, [items]);

  // item: { name, base, sauce, cheese, veggies: [ids] } (ids are inventory ids)
  const add = (item) =>
    setItems((prev) => {
      const sig = signature(item);
      const found = prev.find((p) => signature(p) === sig && p.name === item.name);
      if (found) return prev.map((p) => (p === found ? { ...p, qty: Math.min(10, p.qty + 1) } : p));
      return [...prev, { ...item, qty: 1, key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }];
    });
  const setQty = (key, qty) =>
    setItems((prev) => prev.map((p) => (p.key === key ? { ...p, qty: Math.max(1, Math.min(10, qty)) } : p)));
  const remove = (key) => setItems((prev) => prev.filter((p) => p.key !== key));
  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.qty, 0);

  return <CartCtx.Provider value={{ items, add, setQty, remove, clear, count }}>{children}</CartCtx.Provider>;
}
