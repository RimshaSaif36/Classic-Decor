const mongoose = require("mongoose");
const { sendOrderConfirmation } = require("../utils/mailer");
const Joi = require("joi");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));
const SHEETDB_URL = process.env.SHEETDB_URL || "";

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

async function createOrder(req, res) {
  try {
    const body = req.body || {};

    console.log(
      "[orders] Creating order, MongoDB connected:",
      mongoose.connection.readyState === 1
    );
    console.log("[orders] Request user:", req.user);

    // ALWAYS try MongoDB first if configured
    const OrderModel = getOrderModel();
    console.log("[orders] OrderModel available:", !!OrderModel);
    console.log(
      "[orders] MongoDB dbConnected:",
      req.app.locals.dbConnected
    );

    if (OrderModel && req.app.locals.dbConnected) {
      try {
        const orderData = {
          userId:
            req.user &&
            req.user.id &&
            String(req.user.id).match(/^[0-9a-fA-F]{24}$/)
              ? req.user.id
              : null,
          name: body.name,
          address: body.address,
          city: body.city,
          phone: body.phone,
          email: body.email,
          payment: body.payment,
          items: body.items || [],
          subtotal: Number(body.subtotal) || 0,
          shipping: Number(body.shipping) || 0,
          total: Number(body.total) || 0,
          paymentStatus: body.paymentStatus || "pending",
          transactionId: body.transactionId || "",
          metadata: body.metadata || {},
        };

        console.log("[orders] Saving to MongoDB:", orderData);
        const doc = new OrderModel(orderData);
        const saved = await doc.save();
        console.log("[orders] Order created in MongoDB:", saved._id);
        try {
          sendOrderConfirmation({
            name: orderData.name,
            total: orderData.total,
            items: orderData.items,
            email: orderData.email,
          });
        } catch (mailErr) {
          console.error(
            "[orders] mail send error:",
            mailErr && mailErr.message ? mailErr.message : mailErr
          );
        }
        return res.status(201).json(saved);
      } catch (dbErr) {
        console.error("[orders] DB save error:", dbErr.message, dbErr);
        // Don't fall back to SHEETDB - let it fail
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
    console.log("[orders] listOrders called - MongoDB dbConnected:", req.app.locals.dbConnected, "OrderModel:", !!OrderModel);

    // If MongoDB is connected, use it
    if (OrderModel && req.app.locals.dbConnected) {
      try {
        const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
        console.log("[orders] Fetched from MongoDB:", docs.length, "orders");
        return res.json(docs || []);
      } catch (dbErr) {
        console.error("[orders] MongoDB fetch error:", dbErr.message);
        // Return error instead of silently falling back
        return res.status(500).json({ error: "Database error: " + dbErr.message });
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
            "orders"
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
    console.log("[orders] No valid data source available - returning empty array");
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
            "0"
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
          dbErr && dbErr.message ? dbErr.message : dbErr
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
            dt.getMonth() + 1
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
            "0"
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
          sheetErr && sheetErr.message ? sheetErr.message : sheetErr
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
    if (!OrderModel) {
      return res.json([]);
    }

    const docs = await OrderModel.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json(docs || []);
  } catch (e) {
    console.error("[orders] myOrders error:", e && e.message ? e.message : e);
    return res.json([]);
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

    const doc = await OrderModel.findByIdAndUpdate(
      id,
      {
        paymentStatus: body.paymentStatus,
        name: body.name,
        phone: body.phone,
        address: body.address,
        items: body.items,
        total: body.total,
      },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ error: "Not found" });
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
  updateOrder,
  deleteOrder,
  reportOrders,
};
