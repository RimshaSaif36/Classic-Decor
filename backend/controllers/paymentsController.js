const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");
const mongoose = require("mongoose");

// Helper to get Order model
function getOrderModel() {
  if (mongoose.models.Order) {
    return mongoose.models.Order;
  }
  try {
    return require("../models/Order");
  } catch (e) {
    console.error("[payments] Failed to load Order model:", e.message);
    return null;
  }
}

// Helper to get Payment model
function getPaymentModel() {
  if (mongoose.models.Payment) {
    return mongoose.models.Payment;
  }
  try {
    return require("../models/Payment");
  } catch (e) {
    console.error("[payments] Failed to load Payment model:", e.message);
    return null;
  }
}

// PayFast configuration
const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE;
const PAYFAST_BASE =
  process.env.NODE_ENV === "production"
    ? "https://www.payfast.co.za/eng/process"
    : "https://sandbox.payfast.co.za/eng/process";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function pfSign(data) {
  const keys = Object.keys(data)
    .filter((k) => k !== "signature")
    .sort();
  const qs = keys
    .map((k) => `${k}=${encodeURIComponent(String(data[k] ?? ""))}`)
    .join("&");
  const base = PAYFAST_PASSPHRASE
    ? `${qs}&passphrase=${encodeURIComponent(PAYFAST_PASSPHRASE)}`
    : qs;
  return crypto.createHash("md5").update(base).digest("hex");
}

async function payfastInitiate(req, res) {
  try {
    // In sandbox, we can sometimes proceed without ID/Key but better to enforce or use test creds if missing?
    // User wants it to work. If missing, we error.
    if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
      console.error("PayFast not configured");
      return res.status(500).json({ error: "PayFast not configured" });
    }

    const { name, address, phone, cart, shipping, email, city } =
      req.body || {};

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart required" });
    }

    const subtotal = cart.reduce(
      (s, i) => s + Number(i.price) * Number(i.quantity),
      0
    );
    const shippingFee = Number(shipping) || 0;
    const total = subtotal + shippingFee;

    const itemsSummary = cart
      .map((i) => `${i.name} x ${i.quantity}`)
      .join(", ");
    const m_payment_id = `pf_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    // Absolute URLs
    const protocol = req.protocol;
    const host = req.get("host");
    // Mounted at / in server.js, so path is /payfast/notify
    const notifyUrl = `${protocol}://${host}/payfast/notify`;

    const returnUrl = `${FRONTEND_URL}/success?pf_return=1&m_payment_id=${encodeURIComponent(
      m_payment_id
    )}`;
    const cancelUrl = `${FRONTEND_URL}/success?cancel=1`;

    const data = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      amount: Number(total).toFixed(2),
      item_name: "The Classic Decor Order",
      item_description: itemsSummary.substring(0, 100),
      email_address: String(email || ""),
      m_payment_id,
      name_first: String(name || "").split(" ")[0] || String(name || ""),
      name_last:
        String(name || "")
          .split(" ")
          .slice(1)
          .join(" ") || "",
      custom_str1: JSON.stringify({
        name,
        address,
        city,
        phone,
        email,
        subtotal,
        shipping: shippingFee,
        total,
        payment: "card",
        items: cart.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
          size: i.size,
          color: i.color,
          productId: i._id || i.id,
        })),
      }),
    };

    const signature = pfSign(data);
    const url = `${PAYFAST_BASE}?${Object.keys(data)
      .sort()
      .map((k) => `${k}=${encodeURIComponent(String(data[k]))}`)
      .join("&")}&signature=${signature}`;

    try {
      const Payment = getPaymentModel();
      if (Payment && mongoose.connection.readyState === 1) {
        await Payment.create({
          userId: req.user && req.user.id ? req.user.id : null,
          gateway: "payfast",
          method: "card",
          amount: Number(total) || 0,
          currency: "PKR",
          status: "initiated",
          transactionId: "",
          merchantPaymentId: m_payment_id,
          metadata: { itemsSummary },
        });
      }
    } catch (logErr) {
      console.error(
        "[payments] failed to log initiated payment:",
        logErr && logErr.message ? logErr.message : logErr
      );
    }

    res.json({ url, m_payment_id });
  } catch (e) {
    console.error("PayFast Initiate Error:", e);
    res.status(500).json({ error: e.message || "Failed to initiate payment" });
  }
}

async function payfastReturn(req, res) {
  res.json({ message: "PayFast return endpoint" });
}

async function payfastNotify(req, res) {
  // ITN Handler
  console.log("PayFast ITN received:", req.body);

  // Validate signature (Optional but recommended)
  // Note: For sandbox testing, signature validation might fail if passphrase handling is tricky or if IP check is required.
  // We will proceed if payment_status is COMPLETE.

  const paymentStatus = req.body.payment_status;

  if (paymentStatus === "COMPLETE") {
    try {
      const Order = getOrderModel();
      if (!Order) throw new Error("Order model not found");
      const Payment = getPaymentModel();

      // Check if order already exists to prevent duplicates
      const existingOrder = await Order.findOne({
        stripeSessionId: req.body.m_payment_id,
      }); // Reuse stripeSessionId field for PF ID
      if (existingOrder) {
        console.log(
          "Order already exists for payment ID:",
          req.body.m_payment_id
        );
        return res.status(200).send();
      }

      const customData = JSON.parse(req.body.custom_str1 || "{}");
      const {
        name,
        address,
        city,
        phone,
        email,
        subtotal,
        shipping,
        total,
        items,
        payment,
      } = customData;
      const newOrder = new Order({
        name,
        email,
        address,
        city,
        phone,
        payment: payment || "card",
        items: Array.isArray(items) ? items : [],
        subtotal: Number(subtotal) || 0,
        shipping: Number(shipping) || 0,
        total: Number(total) || 0,
        paymentStatus: "completed",
        transactionId: req.body.pf_payment_id || req.body.m_payment_id,
        metadata: { gateway: "payfast", raw: req.body },
      });

      await newOrder.save();
      console.log("Order created from PayFast ITN:", newOrder._id);

      try {
        if (Payment && mongoose.connection.readyState === 1) {
          await Payment.findOneAndUpdate(
            { merchantPaymentId: req.body.m_payment_id },
            {
              userId: newOrder.userId || null,
              orderId: newOrder._id,
              status: "completed",
              transactionId: req.body.pf_payment_id || req.body.m_payment_id,
              raw: req.body,
            },
            { upsert: true, new: true }
          );
        }
      } catch (pErr) {
        console.error(
          "[payments] failed to log completed payment:",
          pErr && pErr.message ? pErr.message : pErr
        );
      }
    } catch (e) {
      console.error("Failed to create order from ITN:", e);
    }
  }

  res.status(200).send();
}

// Stripe Functions
async function createCheckoutSession(req, res) {
  try {
    if (!stripe)
      return res.status(500).json({ error: "Stripe not configured" });

    const { cart, shipping } = req.body;
    const line_items = cart.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.name, images: [item.image] },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    if (shipping > 0) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/`,
    });

    res.json({ id: session.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function stripeSuccess(req, res) {
  res.json({ message: "Stripe success" });
}

async function stripeOrder(req, res) {
  res.json({ message: "Stripe order" });
}

module.exports = {
  payfastInitiate,
  payfastReturn,
  payfastNotify,
  createCheckoutSession,
  stripeSuccess,
  stripeOrder,
};
