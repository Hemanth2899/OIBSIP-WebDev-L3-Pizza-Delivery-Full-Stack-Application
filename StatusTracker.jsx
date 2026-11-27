import { STATUSES } from '../utils.js';

export default function StatusTracker({ status }) {
  const current = STATUSES.indexOf(status);
  return (
    <ol className="tracker" aria-label={`Order status: ${status}`}>
      {STATUSES.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'now' : ''}>
          <span className="dot" />
          {s}
        </li>
      ))}
    </ol>
  );
}
