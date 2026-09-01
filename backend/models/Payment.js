const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  gateway: { type: String, enum: ["payfast", "stripe", "cod", "jazzcash", "easypaisa"], default: "payfast" },
  method: { type: String, default: "card" },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: "PKR" },
  status: { type: String, enum: ["initiated", "completed", "failed", "cancelled"], default: "initiated" },
  transactionId: { type: String, index: true },
  merchantPaymentId: { type: String, index: true }, // e.g., PayFast m_payment_id
  metadata: { type: mongoose.Schema.Types.Mixed },
  raw: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

PaymentSchema.index({ gateway: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
