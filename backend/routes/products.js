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
  createProduct,
} = require("../controllers/productsController");

// GET /api/products - supports filtering, search, sort, pagination
router.get("/", listProducts);

// GET /api/products/featured - get featured products
router.get("/featured", listFeaturedProducts);

router.post("/", requireAuth, requireAdmin, createProduct);

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const updates = req.body || {};
  
  // Handle MongoDB update if connected
  if (ProductModel && req.app.locals.dbConnected) {
    try {
      const conds = [];
      if (mongoose.Types.ObjectId.isValid(id)) conds.push({ _id: id });
      const numeric = Number(id);
      if (!isNaN(numeric)) conds.push({ id: numeric });
      conds.push({ slug: id });
      const query = conds.length > 1 ? { $or: conds } : conds[0];
      const updated = await ProductModel.findOneAndUpdate(query, updates, {
        new: true,
        runValidators: false
      }).lean();
      if (!updated) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.json(updated);
    } catch (err) {
      console.error(
        "[products] db update error:",
        err && err.message ? err.message : err
      );
      return res.status(500).json({ error: "Failed to update product" });
    }
  }
  
  // Fallback to JSON file update
  try {
    const products = read("products");
    const numId = Number(id);
    const idx = products.findIndex((p) => p.id === numId);
    if (idx === -1) {
      return res.status(404).json({ error: "Product not found" });
    }
    products[idx] = { ...products[idx], ...updates, id: numId };
    write("products", products);
    res.json(products[idx]);
  } catch (err) {
    console.error(
      "[products] file update error:",
      err && err.message ? err.message : err
    );
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  
  // Handle MongoDB deletion if connected
  if (ProductModel && req.app.locals.dbConnected) {
    try {
      const conds = [];
      if (mongoose.Types.ObjectId.isValid(id)) conds.push({ _id: id });
      const numeric = Number(id);
      if (!isNaN(numeric)) conds.push({ id: numeric });
      conds.push({ slug: id });
      const query = conds.length > 1 ? { $or: conds } : conds[0];
      const result = await ProductModel.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.status(204).end();
    } catch (err) {
      console.error(
        "[products] db delete error:",
        err && err.message ? err.message : err
      );
      return res.status(500).json({ error: "Failed to delete product" });
    }
  }
  
  // Fallback to JSON file deletion
  try {
    const products = read("products");
    const numId = Number(id);
    const idx = products.findIndex((p) => p.id === numId);
    if (idx === -1) {
      return res.status(404).json({ error: "Product not found" });
    }
    const next = products.filter((p) => p.id !== numId);
    write("products", next);
    res.status(204).end();
  } catch (err) {
    console.error(
      "[products] file delete error:",
      err && err.message ? err.message : err
    );
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// GET related products (same category or shared tags) - must come before /:id
router.get("/:id/related", relatedProducts);

// GET single product by numeric id or slug
router.get("/:id", getProduct);
module.exports = router;