const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    pointsSpent: { type: Number, required: true },
    couponCode: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Redemption', redemptionSchema);
