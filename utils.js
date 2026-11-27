import { useEffect, useRef } from 'react';

export const STATUSES = ['Order Received', 'In Kitchen', 'Sent to Delivery'];
export const rupee = (n) => '\u20B9' + Number(n || 0).toLocaleString('en-IN');

/** Calls fn immediately and then every `ms` while the tab is visible. fn should catch its own errors. */
export function usePolling(fn, ms) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let on = true;
    const tick = () => {
      if (on && !document.hidden) ref.current();
    };
    tick();
    const id = setInterval(tick, ms);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [ms]);
}

export function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}
