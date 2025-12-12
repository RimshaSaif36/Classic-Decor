require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const SHEETDB_URL =
  process.env.SHEETDB_URL || "https://sheetdb.io/api/v1/rxqrvvtgxbndk";
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const CURRENCY = process.env.STRIPE_CURRENCY || "usd";
const FX_PKR_TO_USD = Number(
  process.env.FX_PKR_TO_USD || process.env.EXCHANGE_PKR_TO_USD || 0.0036
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "..")));

// Security
try {
  app.use(require("helmet")());
} catch (_) {}
try {
  const rateLimit = require("express-rate-limit");
  app.use(rateLimit({ windowMs: 60 * 1000, max: 300 }));
} catch (_) {}

// ------------------- HEALTH CHECK -------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "aaraish-backend" });
});

// ------------------- STRIPE CONFIG STATUS -------------------
app.get("/config-status", (req, res) => {
  res.json({ stripe_configured: !!STRIPE_SECRET_KEY, currency: CURRENCY });
});

// ------------------- CREATE CHECKOUT SESSION -------------------
app.post("/create-checkout-session", async (req, res) => {
  try {
    if (!stripe)
      return res.status(500).json({ error: "Stripe not configured" });

    const { name, address, phone, cart, shipping } = req.body || {};
    if (!Array.isArray(cart) || cart.length === 0)
      return res.status(400).json({ error: "Cart required" });

    const isPKR = String(CURRENCY).toLowerCase() === "pkr";

    function toUnitAmount(price, curr) {
      const n = Number(price) || 0;
      if (isPKR && curr === "usd")
        return Math.max(50, Math.round(n * FX_PKR_TO_USD * 100));
      return Math.round(n * 100);
    }

    function buildLineItems(curr) {
      const items = cart.map((item) => ({
        price_data: {
          currency: curr,
          product_data: { name: item.name },
          unit_amount: toUnitAmount(item.price, curr),
        },
        quantity: Number(item.quantity) || 1,
      }));

      if (shipping && Number(shipping) > 0) {
        items.push({
          price_data: {
            currency: curr,
            product_data: { name: "Shipping" },
            unit_amount: toUnitAmount(Number(shipping), curr),
          },
          quantity: 1,
        });
      }

      return items;
    }

    const order = {
      name,
      address,
      phone,
      items: cart
        .map(
          (i) =>
            `${i.name} x ${i.quantity} (PKR ${i.price})${
              i.size ? " | size: " + i.size : ""
            }${i.color ? " | color: " + i.color : ""}`
        )
        .join(", "),
      sizes: cart
        .map((i) => i.size || "")
        .filter(Boolean)
        .join(", "),
      colors: cart
        .map((i) => i.color || "")
        .filter(Boolean)
        .join(", "),
      subtotal: cart.reduce(
        (s, i) => s + Number(i.price) * Number(i.quantity),
        0
      ),
      shipping: Number(shipping) || 0,
      total:
        cart.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0) +
        (Number(shipping) || 0),
      date: new Date().toLocaleString(),
    };

    async function createSession(curr) {
      return stripe.checkout.sessions.create({
        mode: "payment",
        line_items: buildLineItems(curr),
        success_url: `http://localhost:${PORT}/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:${PORT}/stripe-cancel`,
        metadata: { order: JSON.stringify(order) },
      });
    }

    try {
      const firstCurrency = isPKR ? "usd" : CURRENCY;
      const s = await createSession(firstCurrency);
      return res.json({ url: s.url });
    } catch (e1) {
      try {
        const s2 = await createSession("usd");
        return res.json({ url: s2.url });
      } catch (e2) {
        return res
          .status(500)
          .json({ error: e1?.message || "Failed to create session" });
      }
    }
  } catch (e) {
    res.status(500).json({ error: e?.message || "Failed to create session" });
  }
});

// ------------------- STRIPE SUCCESS -------------------
app.get("/stripe-success", async (req, res) => {
  try {
    if (!stripe) return res.status(500).send("Stripe not configured");

    const id = req.query.session_id;
    if (!id) return res.status(400).send("Missing session_id");

    const session = await stripe.checkout.sessions.retrieve(id);

    if (session.payment_status === "paid") {
      const meta = session.metadata || {};
      const order = meta.order ? JSON.parse(meta.order) : null;

      if (order) {
        try {
          console.log("[stripe-success] posting order to SHEETDB", order);
          const r = await fetch(SHEETDB_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: order }),
          });
          if (!r.ok) {
            const txt = await r.text().catch(() => "");
            console.error(
              "[stripe-success] SHEETDB responded with non-ok:",
              r.status,
              txt
            );
          } else {
            console.log("[stripe-success] posted order to SHEETDB successfully");
          }
        } catch (err) {
          console.error("[stripe-success] failed posting order to SHEETDB:", err && err.message ? err.message : err);
        }
      }

      return res.redirect(`/success.html?session_id=${id}`);
    }

    res.redirect("/index.html?cancel=1");
  } catch (_) {
    res.redirect("/index.html?cancel=1");
  }
});

// ------------------- STRIPE ORDER DETAILS -------------------
app.get("/stripe-order", async (req, res) => {
  try {
    if (!stripe)
      return res.status(500).json({ error: "Stripe not configured" });
    const id = req.query.session_id;
    if (!id) return res.status(400).json({ error: "Missing session_id" });
    const session = await stripe.checkout.sessions.retrieve(id);
    const meta = session.metadata || {};
    const order = meta.order ? JSON.parse(meta.order) : null;
    res.json({
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      order,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Failed" });
  }
});

// ------------------- API ROUTES -------------------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/images", require("./routes/images"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/categories", require("./routes/categories"));

// ------------------- START SERVER -------------------
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});
app.post("/orders", async (req, res) => {
  try {
    if (!SHEETDB_URL) return res.status(500).json({ error: "Orders disabled" });
    const order = req.body || {};
    console.log("[orders] received order:", order);
    try {
      const r = await fetch(SHEETDB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: order }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        console.error("[orders] SHEETDB error:", r.status, t);
        return res.status(500).json({ error: t || "SheetDB error" });
      }
      console.log("[orders] order posted to SHEETDB successfully");
      res.json({ ok: true });
    } catch (err) {
      console.error("[orders] failed to post to SHEETDB:", err && err.message ? err.message : err);
      return res.status(500).json({ error: err && err.message ? err.message : "Failed" });
    }
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Failed" });
  }
});

// ------------------- ORDER TX CHECK -------------------
app.get("/orders/check", async (req, res) => {
  try {
    const tx = String(req.query.transactionId || "").trim();
    if (!SHEETDB_URL || !tx) return res.json({ used: false });
    const r = await fetch(SHEETDB_URL);
    const list = await r.json();
    const used =
      Array.isArray(list) &&
      list.some((o) => String(o.transactionId || "").trim() === tx);
    res.json({ used });
  } catch (_) {
    res.json({ used: false });
  }
});
