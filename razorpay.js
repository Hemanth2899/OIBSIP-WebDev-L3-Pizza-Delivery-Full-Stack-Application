const Razorpay = require('razorpay');
const bad = require('./httpError');

let instance;
module.exports = () => {
  if (!instance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw bad(500, 'Razorpay keys are not configured on the server');
    }
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
};
