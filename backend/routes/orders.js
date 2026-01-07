const express = require("express");
const {
  createOrder,
  listOrders,
  getOrder,
  checkTransaction,
  myOrders,
  updateOrder,
  deleteOrder,
} = require("../controllers/ordersController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, createOrder);
router.get("/", requireAuth, requireAdmin, listOrders);
// Public check endpoint (kept for legacy clients) - must come before /:id
router.get("/check", checkTransaction);
router.get("/my", requireAuth, myOrders);
router.get("/:id", requireAuth, getOrder);
router.put("/:id", requireAuth, requireAdmin, updateOrder);
router.delete("/:id", requireAuth, requireAdmin, deleteOrder);

module.exports = router;
