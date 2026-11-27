const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    category: { type: String, enum: ['base', 'sauce', 'cheese', 'veggie'], required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 }, // INR, per pizza
    stock: { type: Number, required: true, min: 0, default: 0 },
    threshold: { type: Number, required: true, min: 0, default: 20 }, // alert when stock < threshold
    lastAlertAt: { type: Date, default: null },
  },
  { timestamps: true }
);
inventorySchema.index({ category: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
