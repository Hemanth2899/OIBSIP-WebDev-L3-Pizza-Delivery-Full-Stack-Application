const express = require('express');
const Inventory = require('../models/Inventory');
const Pizza = require('../models/Pizza');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(protect);

// Ingredients for the pizza builder, grouped by step. Exact stock counts are not exposed to customers.
router.get(
  '/ingredients',
  asyncHandler(async (req, res) => {
    const items = await Inventory.find().sort({ name: 1 });
    const out = { base: [], sauce: [], cheese: [], veggie: [] };
    items.forEach((i) => out[i.category].push({ id: i._id, name: i.name, price: i.price, available: i.stock > 0 }));
    res.json(out);
  })
);

router.get(
  '/pizzas',
  asyncHandler(async (req, res) => {
    const pizzas = await Pizza.find({ active: true }).populate('base sauce cheese veggies');
    const ref = (d) => ({ id: d._id, name: d.name });
    res.json(
      pizzas.map((p) => {
        const parts = [p.base, p.sauce, p.cheese, ...p.veggies];
        return {
          id: p._id,
          name: p.name,
          description: p.description,
          price: parts.reduce((s, x) => s + x.price, 0),
          available: parts.every((x) => x.stock > 0),
          base: ref(p.base),
          sauce: ref(p.sauce),
          cheese: ref(p.cheese),
          veggies: p.veggies.map(ref),
        };
      })
    );
  })
);

module.exports = router;
