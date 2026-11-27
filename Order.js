const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const STATUSES = ['Order Received', 'In Kitchen', 'Sent to Delivery'];

const itemSchema = new mongoose.Schema(
  {
    name: String,
    qty: Number,
    unitPrice: Number,
    base: { type: ObjectId, ref: 'Inventory' },
    sauce: { type: ObjectId, ref: 'Inventory' },
    cheese: { type: ObjectId, ref: 'Inventory' },
    veggies: [{ type: ObjectId, ref: 'Inventory' }],
    ingredients: { base: String, sauce: String, cheese: String, veggies: [String] }, // name snapshot
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    items: [itemSchema],
    amount: { type: Number, required: true }, // INR
    currency: { type: String, default: 'INR' },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: String,
    paymentStatus: { type: String, enum: ['created', 'paid'], default: 'created' },
    status: { type: String, enum: ['Pending Payment', ...STATUSES], default: 'Pending Payment' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;
