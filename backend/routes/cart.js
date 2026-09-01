const express = require("express");
const mongoose = require("mongoose");
let CartModel = null;
try {
  CartModel = require("../models/Cart");
} catch (e) {
  CartModel = null;
}
const { requireAuth } = require("../middleware/auth");
const { computeShipping } = require("../utils/shipping");

const router = express.Router();

// Save or update current user's cart
router.post("/save", requireAuth, async (req, res) => {
  try {
    if (!CartModel || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Cart storage unavailable" });
    }
    const payload = req.body || {};
    const subtotal = Array.isArray(payload.items)
      ? payload.items.reduce(
          (s, i) => s + Number(i.price) * Number(i.quantity || 1),
          0,
        )
      : 0;
    // Apply free shipping for orders above configured threshold
    const shipping = computeShipping(subtotal);
    const total = subtotal + shipping;
    const doc = await CartModel.findOneAndUpdate(
      { userId: req.user.id },
      {
        userId: req.user.id,
        sessionId: payload.sessionId || "",
        items: Array.isArray(payload.items) ? payload.items : [],
        subtotal,
        shipping,
        total,
        status: payload.status || "active",
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    ).lean();
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Failed" });
  }
});

// Get current user's cart
router.get("/my", requireAuth, async (req, res) => {
  try {
    if (!CartModel || mongoose.connection.readyState !== 1) {
      return res.json({ items: [], subtotal: 0, shipping: 0, total: 0 });
    }
    const doc = await CartModel.findOne({ userId: req.user.id }).lean();
    res.json(doc || { items: [], subtotal: 0, shipping: 0, total: 0 });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Failed" });
  }
});

// Optional: get cart by session (guest)
router.get("/session/:id", async (req, res) => {
  try {
    if (!CartModel || mongoose.connection.readyState !== 1) {
      return res.json({ items: [], subtotal: 0, shipping: 0, total: 0 });
    }
    const doc = await CartModel.findOne({ sessionId: req.params.id }).lean();
    res.json(doc || { items: [], subtotal: 0, shipping: 0, total: 0 });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Failed" });
  }
});

module.exports = router;
