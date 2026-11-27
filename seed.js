// Creates the admin account, inventory and sample pizzas. Safe to run more than once.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Inventory = require('./models/Inventory');
const Pizza = require('./models/Pizza');

const stockData = [
  // [category, name, price, stock, threshold]
  ['base', 'Classic Hand-Tossed', 80, 100, 20],
  ['base', 'Thin Crust', 90, 100, 20],
  ['base', 'Whole Wheat', 100, 100, 20],
  ['base', 'Cheese Burst', 130, 100, 20],
  ['base', 'Multigrain', 110, 100, 20],
  ['sauce', 'Classic Tomato', 20, 80, 15],
  ['sauce', 'Basil Pesto', 30, 80, 15],
  ['sauce', 'Spicy Arrabbiata', 25, 80, 15],
  ['sauce', 'Garlic Cream', 30, 80, 15],
  ['sauce', 'Smoky Barbecue', 30, 80, 15],
  ['cheese', 'Mozzarella', 50, 80, 15],
  ['cheese', 'Cheddar', 45, 80, 15],
  ['cheese', 'Parmesan', 55, 80, 15],
  ['cheese', 'Vegan Cashew', 65, 80, 15],
  ['veggie', 'Onion', 15, 60, 10],
  ['veggie', 'Capsicum', 15, 60, 10],
  ['veggie', 'Tomato', 15, 60, 10],
  ['veggie', 'Mushroom', 20, 60, 10],
  ['veggie', 'Sweet Corn', 20, 60, 10],
  ['veggie', 'Black Olives', 25, 60, 10],
  ['veggie', 'Jalapeno', 20, 60, 10],
  ['veggie', 'Baby Spinach', 20, 60, 10],
];

const pizzas = [
  { name: 'Margherita', description: 'Tomato, mozzarella and fresh tomato slices on a hand-tossed base.', base: 'Classic Hand-Tossed', sauce: 'Classic Tomato', cheese: 'Mozzarella', veggies: ['Tomato'] },
  { name: 'Farmhouse', description: 'Onion, capsicum, mushroom and sweet corn under melted mozzarella.', base: 'Classic Hand-Tossed', sauce: 'Classic Tomato', cheese: 'Mozzarella', veggies: ['Onion', 'Capsicum', 'Mushroom', 'Sweet Corn'] },
  { name: 'Pesto Garden', description: 'Basil pesto, parmesan, spinach, olives and tomato on thin crust.', base: 'Thin Crust', sauce: 'Basil Pesto', cheese: 'Parmesan', veggies: ['Baby Spinach', 'Black Olives', 'Tomato'] },
  { name: 'Fire Burst', description: 'Spicy arrabbiata, cheddar and jalapeno on a cheese-filled crust.', base: 'Cheese Burst', sauce: 'Spicy Arrabbiata', cheese: 'Cheddar', veggies: ['Jalapeno', 'Onion', 'Capsicum'] },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  const email = ADMIN_EMAIL.toLowerCase();
  if (!(await User.findOne({ email }))) {
    await User.create({
      name: ADMIN_NAME || 'Admin',
      email,
      password: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: 'admin',
      isVerified: true,
    });
    console.log(`Admin created: ${email}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  for (const [category, name, price, stock, threshold] of stockData) {
    await Inventory.updateOne({ category, name }, { $setOnInsert: { price, stock, threshold } }, { upsert: true });
  }
  console.log(`Inventory ready (${stockData.length} items)`);

  const inv = await Inventory.find();
  const idOf = (category, name) => {
    const d = inv.find((i) => i.category === category && i.name === name);
    if (!d) throw new Error(`Missing ingredient: ${name}`);
    return d._id;
  };
  for (const p of pizzas) {
    await Pizza.updateOne(
      { name: p.name },
      {
        $setOnInsert: {
          description: p.description,
          base: idOf('base', p.base),
          sauce: idOf('sauce', p.sauce),
          cheese: idOf('cheese', p.cheese),
          veggies: p.veggies.map((v) => idOf('veggie', v)),
        },
      },
      { upsert: true }
    );
  }
  console.log(`Pizzas ready (${pizzas.length})`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
