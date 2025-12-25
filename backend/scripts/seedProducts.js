const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const fs = require("fs");

const MONGODB_URI = process.env.MONGODB_URI || "";
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set in env");
  process.exit(1);
}

const Product = require("../models/Product");

async function run() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB for seeding");
  const file = path.resolve(__dirname, "..", "data", "products.json");
  if (!fs.existsSync(file)) {
    console.error("products.json not found at", file);
    process.exit(1);
  }
  const raw = fs.readFileSync(file, "utf8");
  const products = JSON.parse(raw);
  if (!Array.isArray(products)) {
    console.error("products.json is not an array");
    process.exit(1);
  }
  // Optional: clear existing
  await Product.deleteMany({});
  const docs = products.map((p, i) => ({
    name: p.name || "Untitled",
    price: Number(p.price) || 0,
    image: p.image || p.img || "",
    category: p.category || "",
    variants: p.variants || [],
    stock: Number(p.stock) || 0,
    status: p.status || "active",
    slug: p.slug || String(Date.now()) + Math.random().toString(36).slice(2, 7),
    metaTitle: p.metaTitle || "",
    metaDescription: p.metaDescription || "",
    description: p.description || p.desc || "",
    tags: p.tags || [],
    colors: p.colors || [],
    sizes: p.sizes || [],
    isFeatured: i < 4,
    createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
  }));

  await Product.insertMany(docs);
  console.log("Seeded", docs.length, "products");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
