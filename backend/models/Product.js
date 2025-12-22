const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  name: String,
  price: Number,
  sku: String,
  stock: Number
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  image: { type: String, default: '' },
  category: { type: String, index: true },
  variants: { type: [VariantSchema], default: [] },
  stock: { type: Number, default: 0 },
  status: { type: String, default: 'active', enum: ['active', 'inactive'] },
  slug: { type: String, index: true },
  metaTitle: String,
  metaDescription: String,
  description: String,
  tags: { type: [String], default: [] },
  colors: { type: [String], default: [] },
  sizes: { type: [String], default: [] },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Text index for search
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
