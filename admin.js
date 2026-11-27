const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const { protect, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const bad = require('../utils/httpError');
const { signJwt } = require('../utils/token');
const { checkStock } = require('../jobs/stockJob');

const router = express.Router();

// Separate admin sign-in. Admin accounts are created only by the seed script, never by registration.
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password))) {
      throw bad(401, 'Incorrect email or password');
    }
    res.json({ token: signJwt(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  })
);

router.use(protect, requireRole('admin'));

router.get(
  '/inventory',
  asyncHandler(async (req, res) => {
    res.json(await Inventory.find().sort({ category: 1, name: 1 }));
  })
);

router.patch(
  '/inventory/:id',
  asyncHandler(async (req, res) => {
    const update = {};
    for (const field of ['stock', 'threshold', 'price']) {
      if (req.body[field] === undefined) continue;
      const n = Number(req.body[field]);
      if (!Number.isFinite(n) || n < 0) throw bad(400, `${field} must be a number that is 0 or more`);
      update[field] = Math.round(n);
    }
    if (!Object.keys(update).length) throw bad(400, 'Nothing to update');
    const item = await Inventory.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!item) throw bad(404, 'Item not found');
    res.json(item);
  })
);

// Runs the low-stock check immediately (also useful for testing email setup)
router.post(
  '/stock-check',
  asyncHandler(async (req, res) => {
    res.json(await checkStock({ force: true }));
  })
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ paymentStatus: 'paid' }).populate('user', 'name email').sort('-createdAt').limit(100);
    res.json(orders);
  })
);

router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    if (!Order.STATUSES.includes(req.body.status)) throw bad(400, 'Invalid status');
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, paymentStatus: 'paid' },
      { status: req.body.status },
      { new: true }
    ).populate('user', 'name email');
    if (!order) throw bad(404, 'Order not found');
    res.json(order);
  })
);

module.exports = router;
