import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import PizzaArt from '../components/PizzaArt.jsx';
import { rupee } from '../utils.js';

const STEPS = [
  { key: 'base', title: 'Choose your base', multi: false },
  { key: 'sauce', title: 'Choose your sauce', multi: false },
  { key: 'cheese', title: 'Choose your cheese', multi: false },
  { key: 'veggie', title: 'Choose your vegetables', multi: true },
  { key: 'review', title: 'Review your pizza' },
];

export default function Builder() {
  const nav = useNavigate();
  const { add } = useCart();
  const [ing, setIng] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState({ base: null, sauce: null, cheese: null, veggie: [] });
  const [name, setName] = useState('');

  useEffect(() => {
    api.get('/menu/ingredients').then((r) => setIng(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <p className="note err">{error}</p>;
  if (!ing) return <p className="muted">Loading ingredients...</p>;

  const find = (cat, id) => ing[cat].find((x) => x.id === id);
  const chosen = {
    base: find('base', sel.base),
    sauce: find('sauce', sel.sauce),
    cheese: find('cheese', sel.cheese),
    veggie: sel.veggie.map((id) => find('veggie', id)).filter(Boolean),
  };
  const total = [chosen.base, chosen.sauce, chosen.cheese, ...chosen.veggie].reduce((s, x) => s + (x?.price || 0), 0);
  const current = STEPS[step];
  const canNext = current.key === 'veggie' || current.key === 'review' || !!sel[current.key];

  const choose = (item) => {
    if (current.multi) {
      setSel((s) => ({ ...s, veggie: s.veggie.includes(item.id) ? s.veggie.filter((v) => v !== item.id) : [...s.veggie, item.id] }));
    } else {
      setSel((s) => ({ ...s, [current.key]: item.id }));
    }
  };
  const isOn = (item) => (current.multi ? sel.veggie.includes(item.id) : sel[current.key] === item.id);

  const addToCart = () => {
    add({ name: name.trim() || 'Custom pizza', base: sel.base, sauce: sel.sauce, cheese: sel.cheese, veggies: sel.veggie });
    nav('/checkout');
  };

  return (
    <div className="builder">
      <div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.key} className={i === step ? 'now' : i < step ? 'done' : ''}>
              <button disabled={i > step} onClick={() => setStep(i)}>{i + 1}. {s.key === 'veggie' ? 'Vegetables' : s.key === 'review' ? 'Review' : s.key[0].toUpperCase() + s.key.slice(1)}</button>
            </li>
          ))}
        </ol>

        <h2>{current.title}</h2>

        {current.key !== 'review' ? (
          <>
            {current.multi && <p className="muted">Pick as many as you like, or none.</p>}
            <div className="options" role={current.multi ? 'group' : 'radiogroup'}>
              {ing[current.key].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role={current.multi ? 'checkbox' : 'radio'}
                  aria-checked={isOn(item)}
                  disabled={!item.available}
                  className={`option ${isOn(item) ? 'on' : ''}`}
                  onClick={() => choose(item)}
                >
                  <span>{item.name}</span>
                  <small>{item.available ? `+${rupee(item.price)}` : 'Sold out'}</small>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="review">
            <dl>
              <dt>Base</dt><dd>{chosen.base?.name}</dd>
              <dt>Sauce</dt><dd>{chosen.sauce?.name}</dd>
              <dt>Cheese</dt><dd>{chosen.cheese?.name}</dd>
              <dt>Vegetables</dt><dd>{chosen.veggie.length ? chosen.veggie.map((v) => v.name).join(', ') : 'None'}</dd>
            </dl>
            <label className="field">
              <span>Name your pizza (optional)</span>
              <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Custom pizza" />
            </label>
          </div>
        )}

        <div className="wizard-foot">
          <button className="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
          {current.key === 'review' ? (
            <button className="btn primary" onClick={addToCart}>Add to cart - {rupee(total)}</button>
          ) : (
            <button className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Next</button>
          )}
        </div>
      </div>

      <aside className="preview">
        <PizzaArt base={chosen.base?.name} sauce={chosen.sauce?.name} cheese={chosen.cheese?.name} veggies={chosen.veggie.map((v) => v.name)} />
        <p className="price-tag">{rupee(total)}</p>
      </aside>
    </div>
  );
}
