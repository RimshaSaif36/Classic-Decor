const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.Mixed, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, default: 'Anonymous' },
  title: { type: String, default: '' },
  comment: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
});

module.exports = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
