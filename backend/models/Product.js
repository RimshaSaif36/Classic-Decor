const mongoose = require("mongoose");

const VariantSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    sku: String,
    stock: Number,
  },
  { _id: false },
);

const SizeSchema = new mongoose.Schema(
  {
    id: String, // 'xs', 's', 'm', 'l', 'xl'
    label: String, // 'Extra Small (XS)', etc.
    circleSquare: String, // '6 × 6'
    rectangle: String, // '6 × 8'
    inches: Number, // 6
    available: { type: Boolean, default: true },
  },
  { _id: false },
);

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  image: { type: String, default: "" },
  category: { type: String, index: true },
  variants: { type: [VariantSchema], default: [] },
  stock: { type: Number, default: 0 },
  status: { type: String, default: "active", enum: ["active", "inactive"] },
  slug: { type: String, index: true },
  metaTitle: String,
  metaDescription: String,
  description: String,
  tags: { type: [String], default: [] },
  colors: { type: [String], default: [] },
  sizes: { type: [String], default: [] },
  sizeDetails: { type: [SizeSchema], default: [] }, // Structured size info with dimensions
  isFeatured: { type: Boolean, default: false },
  saleDiscount: { type: Number, default: 0, min: 0, max: 100 }, // Discount percentage (0-100)
  salePrice: { type: Number, default: 0 }, // Automatically calculated price after discount
  createdAt: { type: Date, default: Date.now },
});

// Text index for search
ProductSchema.index({ name: "text", description: "text", tags: "text" });

module.exports =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
