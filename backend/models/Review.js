const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// A user can only have ONE review per shop (enforced at the DB level, not just app logic)
reviewSchema.index({ shop: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
