const mongoose = require("mongoose");
const {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPaymentConfirmation,
} = require("../utils/mailer");
const Joi = require("joi");
const { read } = require("../utils/store");
let UserModel = null;
try {
  UserModel = require("../models/User");
} catch (e) {
  UserModel = null;
}
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));
const SHEETDB_URL = process.env.SHEETDB_URL || "";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseQuotedAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const normalized = raw.replace(/,/g, "");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) || 0 : 0;
}

// Lazy-load Order model - will be available after mongoose connection
function getOrderModel() {
  // Try to get from mongoose.models first (if already registered)
  if (mongoose.models.Order) {
    return mongoose.models.Order;
  }
  // Try to require the model (this will register it with mongoose)
  try {
    return require("../models/Order");
  } catch (e) {
    console.error("[orders] Failed to load Order model:", e.message);
    return null;
  }
}

async function buildOrderOwnershipFilter(req) {
  const userId = String(req.user && req.user.id ? req.user.id : "").trim();
  const orConditions = [];

  if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
    orConditions.push({ userId });
  }

  if (userId && !isNaN(Number(userId))) {
    orConditions.push({ legacyUserId: Number(userId) });
  }

  let email = "";
  if (UserModel && mongoose.connection.readyState === 1) {
    let user = null;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await UserModel.findById(userId).select("email").lean();
    } else if (!isNaN(Number(userId))) {
      user = await UserModel.findOne({ legacyId: Number(userId) })
        .select("email")
        .lean();
    }
    email = String(user && user.email ? user.email : "").toLowerCase();
  } else {
    const users = read("users") || [];
    const found = users.find((entry) => String(entry.id) === userId);
    email = String(found && found.email ? found.email : "").toLowerCase();
  }

  if (email) {
    orConditions.push({ email: new RegExp(`^${escapeRegExp(email)}$`, "i") });
  }

  return orConditions;
}

async function createOrder(req, res) {
  try {
    const body = req.body || {};

    console.log(
      "[orders] Creating order, MongoDB connected:",
      mongoose.connection.readyState === 1,
    );
    console.log("[orders] Request user:", req.user);

    // Validation schema for required fields
    const schema = Joi.object({
      name: Joi.string()
        .required()
        .messages({ "any.required": "Name is required" }),
      email: Joi.string().email().required().messages({
        "any.required": "Email is required",
        "string.email": "Email must be valid",
      }),
      phone: Joi.string()
        .regex(/^(03|\+923|\+92 3)\d{9}$|^03\d{9}$/)
        .required()
        .messages({
          "any.required": "Phone number is required",
          "string.pattern.base": "Phone number must be 11 digits (03XXXXXXXXX)",
        }),
      address: Joi.string().min(5).required().messages({
        "any.required": "Address is required",
        "string.min": "Address must be at least 5 characters long",
      }),
      city: Joi.string()
        .required()
        .messages({ "any.required": "City is required" }),
      items: Joi.array().required(),
      payment: Joi.string(),
      subtotal: Joi.number(),
      shipping: Joi.number(),
      total: Joi.number(),
      senderNumber: Joi.string().allow("").optional(),
      transactionId: Joi.string().allow("").optional(),
      createdAt: Joi.string().optional(),
      metadata: Joi.object().optional(),
    }).unknown(true);

    const { error, value } = schema.validate(body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // ALWAYS try MongoDB first if configured
    const OrderModel = getOrderModel();
    console.log("[orders] OrderModel available:", !!OrderModel);
    console.log("[orders] MongoDB dbConnected:", req.app.locals.dbConnected);

    if (OrderModel && req.app.locals.dbConnected) {
      try {
        const orderData = {
          userId:
            req.user &&
            req.user.id &&
            String(req.user.id).match(/^[0-9a-fA-F]{24}$/)
              ? req.user.id
              : null,
          legacyUserId:
            req.user && req.user.id && !isNaN(Number(req.user.id))
              ? Number(req.user.id)
              : null,
          name: value.name,
          address: value.address,
          city: value.city,
          phone: value.phone,
          email: String(value.email || "").toLowerCase(),
          payment: value.payment,
          items: value.items || [],
          subtotal: Number(value.subtotal) || 0,
          shipping: Number(value.shipping) || 0,
          total: Number(value.total) || 0,
          paymentStatus: value.paymentStatus || "pending",
          transactionId: value.transactionId || "",
          metadata: value.metadata || {},
        };

        console.log("[orders] Saving to MongoDB:", orderData);
        const doc = new OrderModel(orderData);
        const saved = await doc.save();
        console.log("[orders] Order created in MongoDB:", saved._id);
        const isCustomQuoteRequest =
          String(orderData.payment || "").toLowerCase() ===
            "custom-design-request" ||
          (orderData.metadata &&
            (String(orderData.metadata.requestType || "").toLowerCase() ===
              "custom-design" ||
              Boolean(orderData.metadata.needsQuote)));
        try {
          if (!isCustomQuoteRequest) {
            sendOrderConfirmation({
              name: orderData.name,
              total: orderData.total,
              items: orderData.items,
              email: orderData.email,
              orderId: saved._id || saved.id,
            });
          }
        } catch (mailErr) {
          console.error(
            "[orders] mail send error:",
            mailErr && mailErr.message ? mailErr.message : mailErr,
          );
        }
        return res.status(201).json(saved);
      } catch (dbErr) {
        console.error("[orders] DB save error:", dbErr.message, dbErr);
        // Handle validation errors from schema
        if (dbErr.name === "ValidationError") {
          const messages = Object.values(dbErr.errors).map((e) => e.message);
          return res.status(400).json({ error: messages.join(", ") });
        }
        return res
          .status(500)
          .json({ error: "Failed to save order: " + dbErr.message });
      }
    } else {
      console.log("[orders] MongoDB not available - cannot create order");
      return res.status(500).json({ error: "MongoDB connection required" });
    }
  } catch (e) {
    console.error("[orders] create error", e && e.message ? e.message : e);
    res.status(500).json({ error: "Failed" });
  }
}

async function listOrders(req, res) {
  try {
    const OrderModel = getOrderModel();

    // Log connection state for debugging
    console.log(
      "[orders] listOrders called - MongoDB dbConnected:",
      req.app.locals.dbConnected,
      "OrderModel:",
      !!OrderModel,
    );

    // If MongoDB is connected, use it
    if (OrderModel && req.app.locals.dbConnected) {
      try {
        const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
        console.log("[orders] Fetched from MongoDB:", docs.length, "orders");
        return res.json(docs || []);
      } catch (dbErr) {
        console.error("[orders] MongoDB fetch error:", dbErr.message);
        // Return error instead of silently falling back
        return res
          .status(500)
          .json({ error: "Database error: " + dbErr.message });
      }
    }

    console.log("[orders] MongoDB not available, checking fallback options");

    // Fallback to SHEETDB if configured
    if (SHEETDB_URL) {
      try {
        console.log("[orders] Falling back to SHEETDB");
        const r = await fetch(SHEETDB_URL);
        if (r.ok) {
          const response = await r.json();
          // SHEETDB returns { data: [...] } or just [...]
          const list = response.data || response;
          console.log(
            "[orders] Fetched from SHEETDB:",
            Array.isArray(list) ? list.length : 0,
            "orders",
          );
          return res.json(Array.isArray(list) ? list : []);
        } else {
          console.error("[orders] SHEETDB returned status:", r.status);
        }
      } catch (sheetErr) {
        console.error("[orders] SHEETDB fetch error:", sheetErr.message);
      }
    }

    // If neither DB works, return empty array
    console.log(
      "[orders] No valid data source available - returning empty array",
    );
    return res.json([]);
  } catch (e) {
    console.error("[orders] list error:", e && e.message ? e.message : e);
    return res.json([]);
  }
}

// Analytics: daily (last 30 days) and monthly (last 12 months)
async function reportOrders(req, res) {
  try {
    const OrderModel = getOrderModel();
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 29);
    const start12m = new Date(now);
    start12m.setMonth(start12m.getMonth() - 11);

    if (OrderModel && req.app.locals.dbConnected) {
      try {
        const dailyAgg = await OrderModel.aggregate([
          { $match: { createdAt: { $gte: start30 } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              orders: { $sum: 1 },
              revenue: { $sum: "$total" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        const monthlyAgg = await OrderModel.aggregate([
          { $match: { createdAt: { $gte: start12m } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              orders: { $sum: 1 },
              revenue: { $sum: "$total" },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        // Normalize with zero-filled series
        const dailyMap = new Map(dailyAgg.map((d) => [d._id, d]));
        const monthlyMap = new Map(monthlyAgg.map((m) => [m._id, m]));
        const daily = [];
        for (let d = new Date(start30); d <= now; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10);
          const v = dailyMap.get(key);
          daily.push({
            date: key,
            orders: v ? v.orders : 0,
            revenue: v ? v.revenue : 0,
          });
        }
        const monthly = [];
        for (
          let m = new Date(start12m);
          m <= now;
          m.setMonth(m.getMonth() + 1)
        ) {
          const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(
            2,
            "0",
          )}`;
          const v = monthlyMap.get(key);
          monthly.push({
            month: key,
            orders: v ? v.orders : 0,
            revenue: v ? v.revenue : 0,
          });
        }

        return res.json({ daily, monthly });
      } catch (dbErr) {
        console.error(
          "[orders] report db error:",
          dbErr && dbErr.message ? dbErr.message : dbErr,
        );
      }
    }

    // Fallback to SHEETDB if configured
    if (SHEETDB_URL) {
      try {
        const r = await fetch(SHEETDB_URL);
        const response = await r.json();
        const list = response.data || response;
        const orders = Array.isArray(list) ? list : [];
        const toDate = (v) => new Date(v || Date.now());

        const dailyMap = new Map();
        const monthlyMap = new Map();
        orders.forEach((o) => {
          const dt = toDate(o.createdAt || o.date);
          if (!(dt instanceof Date) || isNaN(dt)) return;
          if (dt < start12m) return;
          const dKey = dt.toISOString().slice(0, 10);
          const mKey = `${dt.getFullYear()}-${String(
            dt.getMonth() + 1,
          ).padStart(2, "0")}`;
          if (dt >= start30) {
            const dv = dailyMap.get(dKey) || { orders: 0, revenue: 0 };
            dv.orders += 1;
            dv.revenue += Number(o.total) || 0;
            dailyMap.set(dKey, dv);
          }
          const mv = monthlyMap.get(mKey) || { orders: 0, revenue: 0 };
          mv.orders += 1;
          mv.revenue += Number(o.total) || 0;
          monthlyMap.set(mKey, mv);
        });

        const daily = [];
        for (let d = new Date(start30); d <= now; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10);
          const v = dailyMap.get(key);
          daily.push({
            date: key,
            orders: v ? v.orders : 0,
            revenue: v ? v.revenue : 0,
          });
        }
        const monthly = [];
        for (
          let m = new Date(start12m);
          m <= now;
          m.setMonth(m.getMonth() + 1)
        ) {
          const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(
            2,
            "0",
          )}`;
          const v = monthlyMap.get(key);
          monthly.push({
            month: key,
            orders: v ? v.orders : 0,
            revenue: v ? v.revenue : 0,
          });
        }
        return res.json({ daily, monthly });
      } catch (sheetErr) {
        console.error(
          "[orders] report sheetdb error:",
          sheetErr && sheetErr.message ? sheetErr.message : sheetErr,
        );
      }
    }

    return res.json({ daily: [], monthly: [] });
  } catch (e) {
    console.error("[orders] report error:", e && e.message ? e.message : e);
    return res.status(500).json({ error: "Failed" });
  }
}

async function getOrder(req, res) {
  try {
    const id = req.params.id;
    const OrderModel = getOrderModel();
    if (!OrderModel) {
      return res.status(404).json({ error: "Not found" });
    }

    const doc = await OrderModel.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    return res.json(doc);
  } catch (e) {
    console.error("[orders] get error:", e && e.message ? e.message : e);
    res.status(500).json({ error: "Failed" });
  }
}

// Public endpoint to check whether a transactionId has been used
async function checkTransaction(req, res) {
  try {
    const tx = String(req.query.transactionId || "").trim();
    if (!tx) return res.json({ used: false });

    // If we have DB, check orders collection
    const OrderModel = getOrderModel();
    if (OrderModel && req.app.locals.dbConnected) {
      const found = await OrderModel.findOne({ transactionId: tx }).lean();
      return res.json({ used: !!found });
    }

    // Fallback to SHEETDB if configured
    if (!SHEETDB_URL) return res.json({ used: false });
    try {
      const r = await fetch(SHEETDB_URL);
      const list = await r.json();
      const used =
        Array.isArray(list) &&
        list.some((o) => String(o.transactionId || "").trim() === tx);
      return res.json({ used });
    } catch (e) {
      return res.json({ used: false });
    }
  } catch (e) {
    return res.json({ used: false });
  }
}

async function myOrders(req, res) {
  try {
    const OrderModel = getOrderModel();
    if (!OrderModel || !req.app.locals.dbConnected) {
      return res.json([]);
    }

    const orConditions = await buildOrderOwnershipFilter(req);

    if (orConditions.length === 0) {
      return res.json([]);
    }

    const docs = await OrderModel.find({ $or: orConditions })
      .sort({ createdAt: -1 })
      .lean();
    return res.json(docs || []);
  } catch (e) {
    console.error("[orders] myOrders error:", e && e.message ? e.message : e);
    return res.json([]);
  }
}

async function cancelMyOrder(req, res) {
  try {
    const id = req.params.id;
    const OrderModel = getOrderModel();

    if (!OrderModel || !req.app.locals.dbConnected) {
      return res.status(404).json({ error: "Not found" });
    }

    const orConditions = await buildOrderOwnershipFilter(req);
    if (orConditions.length === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const existing = await OrderModel.findOne({
      _id: id,
      $or: orConditions,
    }).lean();

    if (!existing) {
      return res.status(404).json({ error: "Order not found" });
    }

    const currentStatus = String(
      existing.paymentStatus || "pending",
    ).toLowerCase();
    if (
      ["shipped", "delivered", "cancelled", "failed"].includes(currentStatus)
    ) {
      return res.status(400).json({
        error: "This order can no longer be cancelled",
      });
    }

    const updated = await OrderModel.findByIdAndUpdate(
      id,
      { paymentStatus: "cancelled" },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    try {
      sendOrderStatusUpdate({
        name: updated.name,
        email: updated.email,
        total: updated.total,
        orderId: updated._id || updated.id,
        paymentStatus: "cancelled",
        previousStatus: currentStatus,
      }).catch((err) => {
        console.error(
          "[orders] Failed to send cancellation email:",
          err.message,
        );
      });
    } catch (err) {
      console.error("[orders] Error in cancellation email:", err.message);
    }

    return res.json(updated);
  } catch (e) {
    console.error(
      "[orders] cancelMyOrder error:",
      e && e.message ? e.message : e,
    );
    return res.status(500).json({ error: "Failed" });
  }
}

async function updateOrder(req, res) {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const OrderModel = getOrderModel();

    if (!OrderModel) {
      return res.status(404).json({ error: "Not found" });
    }

    const existing = await OrderModel.findById(id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });

    const requestedStatus = String(body.paymentStatus || "").toLowerCase();
    const isCustomQuoteRequest =
      String(existing.payment || "").toLowerCase() === "custom-design-request" ||
      (existing.metadata &&
        (String(existing.metadata.requestType || "").toLowerCase() ===
          "custom-design" || Boolean(existing.metadata.needsQuote)));
    const approvedQuoteAmount =
      isCustomQuoteRequest && requestedStatus === "approved"
        ? parseQuotedAmount(
            body.total ?? body.subtotal ?? (existing.metadata && existing.metadata.budget),
          )
        : null;

    const updatePayload = {
      paymentStatus: body.paymentStatus,
      name: body.name,
      phone: body.phone,
      address: body.address,
      items: body.items,
      total: body.total,
    };

    if (approvedQuoteAmount !== null && approvedQuoteAmount > 0) {
      updatePayload.total = approvedQuoteAmount;
      updatePayload.subtotal = approvedQuoteAmount;
      updatePayload.shipping = 0;
      updatePayload.metadata = {
        ...(existing.metadata || {}),
        approvedQuoteAmount,
      };
    }

    const doc = await OrderModel.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true },
    ).lean();

    if (!doc) return res.status(404).json({ error: "Not found" });

    const previousStatus = String(
      existing.paymentStatus || "pending",
    ).toLowerCase();
    const nextStatus = String(
      doc.paymentStatus || previousStatus || "pending",
    ).toLowerCase();
    const statusChanged =
      Boolean(body.paymentStatus) && previousStatus !== nextStatus;

    if (statusChanged && nextStatus === "approved") {
      try {
        if (isCustomQuoteRequest) {
          sendOrderConfirmation({
            name: doc.name,
            total: doc.total,
            subtotal: doc.subtotal,
            shipping: doc.shipping,
            items: doc.items,
            email: doc.email,
            orderId: doc._id || doc.id,
          }).catch((err) => {
            console.error(
              "[orders] Failed to send approval confirmation:",
              err.message,
            );
          });
        } else {
          sendOrderStatusUpdate({
            name: doc.name,
            email: doc.email,
            total: doc.total,
            orderId: doc._id || doc.id,
            paymentStatus: nextStatus,
            previousStatus,
          }).catch((err) => {
            console.error(
              "[orders] Failed to send approval status update:",
              err.message,
            );
          });
        }
      } catch (err) {
        console.error("[orders] Error in approval email:", err.message);
      }
    } else if (
      statusChanged &&
      (nextStatus === "paid" || nextStatus === "completed")
    ) {
      try {
        sendPaymentConfirmation({
          name: doc.name,
          email: doc.email,
          total: doc.total,
          subtotal: doc.subtotal,
          shipping: doc.shipping,
          items: doc.items,
          orderId: doc._id || doc.id,
          transactionId: doc.transactionId || "N/A",
        }).catch((err) => {
          console.error(
            "[orders] Failed to send payment confirmation:",
            err.message,
          );
        });
      } catch (err) {
        console.error("[orders] Error in payment email:", err.message);
      }
    } else if (statusChanged) {
      try {
        sendOrderStatusUpdate({
          name: doc.name,
          email: doc.email,
          total: doc.total,
          orderId: doc._id || doc.id,
          paymentStatus: nextStatus,
          previousStatus,
        }).catch((err) => {
          console.error(
            "[orders] Failed to send order status update:",
            err.message,
          );
        });
      } catch (err) {
        console.error("[orders] Error in status update email:", err.message);
      }
    }

    return res.json(doc);
  } catch (e) {
    console.error("[orders] update error:", e && e.message ? e.message : e);
    res.status(500).json({ error: "Failed" });
  }
}

async function deleteOrder(req, res) {
  try {
    const id = req.params.id;
    const OrderModel = getOrderModel();

    if (!OrderModel) {
      return res.status(404).json({ error: "Not found" });
    }

    const doc = await OrderModel.findByIdAndDelete(id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, message: "Order deleted" });
  } catch (e) {
    console.error("[orders] delete error:", e && e.message ? e.message : e);
    res.status(500).json({ error: "Failed" });
  }
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  checkTransaction,
  myOrders,
  cancelMyOrder,
  updateOrder,
  deleteOrder,
  reportOrders,
};
