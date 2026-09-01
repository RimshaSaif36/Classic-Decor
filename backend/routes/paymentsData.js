const express = require("express");
const mongoose = require("mongoose");
let PaymentModel = null;
try {
  PaymentModel = require("../models/Payment");
} catch (e) {
  PaymentModel = null;
}
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// List payments (admin)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!PaymentModel || mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const list = await PaymentModel.find().sort({ createdAt: -1 }).lean();
    res.json(list || []);
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Failed" });
  }
});

// Get one payment (admin)
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!PaymentModel || mongoose.connection.readyState !== 1) {
      return res.status(404).json({ error: "Not found" });
    }
    const doc = await PaymentModel.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Failed" });
  }
});

module.exports = router;
