const express = require("express");
const { read, write } = require("../utils/store");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const mongoose = require("mongoose");
let ProductModel = null;
try {
  ProductModel = require("../models/Product");
} catch (e) {
  void e;
}

const {
  listProducts,
  getProduct,
  relatedProducts,
  listFeaturedProducts,
} = require("../controllers/productsController");

// GET /api/products - supports filtering, search, sort, pagination
router.get("/", listProducts);

// GET /api/products/featured - get featured products
router.get("/featured", listFeaturedProducts);

router.post("/", requireAuth, requireAdmin, (req, res) => {
  const products = read("products");
  const p = req.body || {};
  const id = Date.now();
  const product = {
    id,
    name: p.name || "Untitled",
    price: Number(p.price) || 0,
    image: p.image || "",
    category: p.category || "",
    variants: p.variants || [],
    stock: Number(p.stock) || 0,
    status: p.status || "active",
    slug: p.slug || String(id),
    metaTitle: p.metaTitle || "",
    metaDescription: p.metaDescription || "",
    description: p.description || "",
    createdAt: new Date().toISOString(),
  };
  products.push(product);
  write("products", products);
  res.status(201).json(product);
});

router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  const products = read("products");
  const id = Number(req.params.id);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  products[idx] = { ...products[idx], ...req.body, id };
  write("products", products);
  res.json(products[idx]);
});

router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  const products = read("products");
  const id = Number(req.params.id);
  const next = products.filter((p) => p.id !== id);
  write("products", next);
  res.status(204).end();
});

// GET single product by numeric id or slug
router.get("/:id", getProduct);

// GET related products (same category or shared tags)
router.get("/:id/related", relatedProducts);

module.exports = router;
