// Live SVG pizza: crust, sauce, cheese and vegetable colours follow what the customer picks.
const pick = (name, table, fallback) => {
  const n = (name || '').toLowerCase();
  const key = Object.keys(table).find((k) => n.includes(k));
  return key ? table[key] : fallback;
};

const CRUST = { 'whole wheat': '#B9854F', multigrain: '#C79A5B', burst: '#E7A83A', thin: '#E2B26B' };
const SAUCE = { pesto: '#6D9B3A', arrabbiata: '#A6200F', cream: '#F2E7CB', barbecue: '#6A2C18', tomato: '#CC3A22' };
const CHEESE = { mozzarella: '#F8EAB8', cheddar: '#F2AE3D', parmesan: '#F4E0A0', vegan: '#EAD7B0' };
const VEG = {
  onion: '#C99BCB', capsicum: '#3F9142', tomato: '#E43D2D', mushroom: '#BCA687',
  corn: '#F4C531', olive: '#2A2A2A', jalape: '#5FA12F', spinach: '#2D6A35',
};

export default function PizzaArt({ base, sauce, cheese, veggies = [] }) {
  const dots = veggies.flatMap((v, vi) =>
    Array.from({ length: 7 }, (_, j) => {
      const n = vi * 7 + j;
      const angle = n * 2.399;
      const r = 18 + ((n * 37) % 100) * 0.85;
      return { x: 150 + r * Math.cos(angle), y: 150 + r * Math.sin(angle), color: pick(v, VEG, '#777'), k: `${v}-${j}` };
    })
  );
  return (
    <svg viewBox="0 0 300 300" className="pizza-art" role="img" aria-label="Preview of your pizza">
      <circle cx="150" cy="150" r="144" fill={base ? pick(base, CRUST, '#E0B070') : '#E9E4D8'} className="fade" />
      <circle cx="150" cy="150" r="144" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="2" />
      <circle cx="150" cy="150" r="124" fill={sauce ? pick(sauce, SAUCE, '#CC3A22') : 'none'} stroke={sauce ? 'none' : 'rgba(0,0,0,.2)'} strokeDasharray="5 6" className="fade" />
      {cheese && <circle cx="150" cy="150" r="114" fill={pick(cheese, CHEESE, '#F6E6B0')} opacity=".92" className="fade" />}
      {dots.map((d) => (
        <circle key={d.k} cx={d.x} cy={d.y} r="7.5" fill={d.color} stroke="rgba(0,0,0,.18)" />
      ))}
    </svg>
  );
}
