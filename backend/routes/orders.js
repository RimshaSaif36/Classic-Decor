const express = require("express");
const {
  createOrder,
  listOrders,
  getOrder,
  checkTransaction,
  myOrders,
} = require("../controllers/ordersController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, createOrder);
router.get("/", requireAuth, requireAdmin, listOrders);
// Public check endpoint (kept for legacy clients) - must come before /:id
router.get("/check", checkTransaction);
router.get("/my", requireAuth, myOrders);
router.get("/:id", requireAuth, getOrder);

module.exports = router;
