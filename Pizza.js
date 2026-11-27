const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const pizzaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    base: { type: ObjectId, ref: 'Inventory', required: true },
    sauce: { type: ObjectId, ref: 'Inventory', required: true },
    cheese: { type: ObjectId, ref: 'Inventory', required: true },
    veggies: [{ type: ObjectId, ref: 'Inventory' }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pizza', pizzaSchema);
