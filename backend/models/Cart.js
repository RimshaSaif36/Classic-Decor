const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.Mixed },
    name: { type: String },
    price: { type: Number },
    quantity: { type: Number, default: 1 },
    size: { type: String },
    color: { type: String },
    image: { type: String },
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  sessionId: { type: String, default: "", index: true },
  items: { type: [CartItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "converted", "abandoned"], default: "active" },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

CartSchema.index({ userId: 1, sessionId: 1 });

module.exports = mongoose.models.Cart || mongoose.model("Cart", CartSchema);
