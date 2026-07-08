const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    photoUrl: { type: String, trim: true, default: '' },
    location: {
      // GeoJSON Point: [lng, lat]
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

shopSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Shop', shopSchema);
