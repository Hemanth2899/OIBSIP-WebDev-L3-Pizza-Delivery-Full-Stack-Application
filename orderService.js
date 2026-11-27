const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const bad = require('./httpError');

const MAX_ITEMS = 20;
const MAX_QTY = 10;

function sanitize(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    throw bad(400, 'Your cart is empty or has too many items');
  }
  return items.map((it) => {
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw bad(400, `Quantity must be between 1 and ${MAX_QTY}`);
    const veggies = [...new Set((Array.isArray(it.veggies) ? it.veggies : []).map(String))];
    if (veggies.length > 10) throw bad(400, 'Too many vegetables selected');
    return {
      name: String(it.name || 'Custom pizza').slice(0, 60),
      qty,
      base: String(it.base),
      sauce: String(it.sauce),
      cheese: String(it.cheese),
      veggies,
    };
  });
}

/**
 * Prices the cart from the database (never trusts client prices) and checks stock.
 * Returns the order lines and the total in INR.
 */
async function priceItems(rawItems) {
  const items = sanitize(rawItems);
  const ids = new Set();
  items.forEach((i) =>
    [i.base, i.sauce, i.cheese, ...i.veggies].forEach((id) => {
      if (!mongoose.isValidObjectId(id)) throw bad(400, 'Your cart has an invalid ingredient. Please rebuild it');
      ids.add(id);
    })
  );
  const docs = await Inventory.find({ _id: { $in: [...ids] } });
  const map = new Map(docs.map((d) => [String(d._id), d]));
  const get = (id, category) => {
    const d = map.get(id);
    if (!d || d.category !== category) throw bad(400, 'Your cart has an unavailable ingredient. Please rebuild it');
    return d;
  };

  const needs = new Map();
  let amount = 0;
  const lines = items.map((i) => {
    const base = get(i.base, 'base');
    const sauce = get(i.sauce, 'sauce');
    const cheese = get(i.cheese, 'cheese');
    const veggies = i.veggies.map((v) => get(v, 'veggie'));
    const parts = [base, sauce, cheese, ...veggies];
    const unitPrice = parts.reduce((s, p) => s + p.price, 0);
    parts.forEach((p) => needs.set(String(p._id), (needs.get(String(p._id)) || 0) + i.qty));
    amount += unitPrice * i.qty;
    return {
      name: i.name,
      qty: i.qty,
      unitPrice,
      base: base._id,
      sauce: sauce._id,
      cheese: cheese._id,
      veggies: veggies.map((v) => v._id),
      ingredients: { base: base.name, sauce: sauce.name, cheese: cheese.name, veggies: veggies.map((v) => v.name) },
    };
  });

  for (const [id, n] of needs) {
    const d = map.get(id);
    if (d.stock < n) throw bad(409, `Sorry, we don't have enough ${d.name} (${d.category}) for this order`);
  }
  return { lines, amount };
}

/** Decrements inventory for a paid order. Stock never goes below zero. */
async function deductStock(items) {
  const needs = new Map();
  for (const it of items) {
    for (const id of [it.base, it.sauce, it.cheese, ...it.veggies]) {
      needs.set(String(id), (needs.get(String(id)) || 0) + it.qty);
    }
  }
  await Promise.all(
    [...needs].map(([id, n]) =>
      Inventory.updateOne({ _id: id }, [{ $set: { stock: { $max: [0, { $subtract: ['$stock', n] }] } } }])
    )
  );
}

module.exports = { priceItems, deductStock };
