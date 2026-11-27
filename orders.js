const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const { protect, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const bad = require('../utils/httpError');
const getRazorpay = require('../utils/razorpay');
const { priceItems, deductStock } = require('../utils/orderService');

const router = express.Router();
router.use(protect, requireRole('user'));

// Price + stock check for the order summary page
router.post(
  '/quote',
  asyncHandler(async (req, res) => {
    const { lines, amount } = await priceItems(req.body.items);
    res.json({ lines, amount });
  })
);

// Creates our order record and the matching Razorpay order
router.post(
  '/create',
  asyncHandler(async (req, res) => {
    const { lines, amount } = await priceItems(req.body.items);
    const rzp = getRazorpay();
    const order = await Order.create({ user: req.user._id, items: lines, amount });
    try {
      const rpOrder = await rzp.orders.create({
        amount: amount * 100, // paise
        currency: 'INR',
        receipt: String(order._id),
      });
      order.razorpayOrderId = rpOrder.id;
      await order.save();
      res.json({
        orderId: order._id,
        razorpayOrderId: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (e) {
      await Order.deleteOne({ _id: order._id });
      throw bad(502, e?.error?.description || 'Could not start the payment. Please try again');
    }
  })
);

// Verifies the Razorpay signature, confirms the order and decrements stock (exactly once)
router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) throw bad(400, 'Missing payment details');

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(razorpay_signature));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw bad(400, 'Payment could not be verified');

    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, user: req.user._id, paymentStatus: 'created' },
      { paymentStatus: 'paid', razorpayPaymentId: razorpay_payment_id, status: 'Order Received' },
      { new: true }
    );
    if (!order) {
      const existing = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
      if (existing && existing.paymentStatus === 'paid') return res.json(existing); // repeat call
      throw bad(404, 'Order not found');
    }
    await deductStock(order.items);
    res.json(order);
  })
);

router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id, paymentStatus: 'paid' }).sort('-createdAt').limit(20);
    res.json(orders);
  })
);

module.exports = router;
