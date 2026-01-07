const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
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

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  legacyUserId: { type: Number, default: null },
  name: { type: String },
  address: { type: String },
  city: { type: String },
  phone: { type: String },
  email: { type: String },
  payment: { type: String },
  items: { type: [OrderItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "shipped", "delivered", "paid"],
    default: "pending",
  },
  transactionId: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);
