require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const SHEETDB_URL =
  process.env.SHEETDB_URL || "https://sheetdb.io/api/v1/rxqrvvtgxbndk";
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const mongoose = require("mongoose");
const MONGODB_URI = process.env.MONGODB_URI || "";
const CURRENCY = process.env.STRIPE_CURRENCY || "usd";

// Connect to MongoDB when MONGODB_URI is provided
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log("Connected to MongoDB");
      app.locals.dbConnected = true;
    })
    .catch((err) => {
      console.error(
        "Failed to connect to MongoDB:",
        err && err.message ? err.message : err
      );
      app.locals.dbConnected = false;
    });
} else {
  app.locals.dbConnected = false;
}
// frontend URL where the React app is served (development default)
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:5173`;
const FX_PKR_TO_USD = Number(
  process.env.FX_PKR_TO_USD || process.env.EXCHANGE_PKR_TO_USD || 0.0036
);

app.use(cors());
app.use(express.json());
// app.use(express.static(path.resolve(__dirname, "..", "frontend", "dist")));

// // Serve images from frontend/images at /images
// try {
//   const imagesDir = path.resolve(__dirname, "..", "frontend", "images");
//   if (fs.existsSync(imagesDir)) {
//     app.use("/images", express.static(imagesDir));
//   }
// } catch (_) {}

// Security
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const router = require("./routes/test");
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, max: 300 }));

// ------------------- HEALTH CHECK -------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "backend" });
});

// ------------------- STRIPE CONFIG STATUS -------------------
app.get("/config-status", (req, res) => {
  res.json({ stripe_configured: !!STRIPE_SECRET_KEY, currency: CURRENCY });
});

// Payments endpoints moved to dedicated route/controllers for clarity
// See: ./routes/payments.js and ./controllers/paymentsController.js

// Stripe success handling moved to ./routes/payments.js -> paymentsController.stripeSuccess

// Stripe order details moved to ./routes/payments.js -> paymentsController.stripeOrder

// ------------------- API ROUTES -------------------
app.use("/api/test", router);
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/products", require("./routes/products"));
app.use("/api/images", require("./routes/images"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/reviews", require("./routes/reviews"));

// ------------------- START SERVER -------------------
// Start server and mount new top-level routes
app.use("/", require("./routes/status"));
app.use("/", require("./routes/payments"));
app.use("/", require("./routes/legacyOrders"));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});
