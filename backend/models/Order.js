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
  name: { type: String, required: true },
  address: { 
    type: String, 
    required: [true, "Address is required"],
    trim: true,
    minlength: [5, "Address must be at least 5 characters long"]
  },
  city: { type: String, required: true },
  phone: { 
    type: String, 
    required: [true, "Phone number is required"],
    validate: {
      validator: function(v) {
        return /^(03|\+923|\+92 3)\d{9}$|^03\d{9}$/.test(v);
      },
      message: "Phone number must be 11 digits (03XXXXXXXXX)"
    }
  },
  email: { 
    type: String, 
    required: [true, "Email is required"],
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Email must be valid"
    }
  },
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
