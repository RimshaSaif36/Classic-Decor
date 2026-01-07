const mongoose = require("mongoose");
const ProductModel = (() => {
  try {
    return require("../models/Product");
  } catch (e) {
    return null;
  }
})();
const { read, write } = require("../utils/store");

async function listProducts(req, res) {
  const q = String(req.query.q || "").trim();
  const category = String(req.query.category || "").trim();
  const min = Number(req.query.min || 0) || 0;
  const max = req.query.max ? Number(req.query.max) : null;
  const sort = String(req.query.sort || "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Number(req.query.limit) || 24);

  if (ProductModel && req.app.locals.dbConnected) {
    const filter = { status: "active" };
    if (q) filter.$text = { $search: q };
    if (category) filter.category = category;
    if (min) filter.price = { $gte: min };
    if (max != null) filter.price = { ...(filter.price || {}), $lte: max };

    let sortObj = { createdAt: -1 };
    if (sort === "price_asc") sortObj = { price: 1 };
    else if (sort === "price_desc") sortObj = { price: -1 };
    else if (sort === "newest") sortObj = { createdAt: -1 };

    const skip = (page - 1) * limit;
    try {
      const docs = await ProductModel.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();
      return res.json(docs);
    } catch (err) {
      console.error(
        "[products] db query error:",
        err && err.message ? err.message : err
      );
      return res.status(500).json({ error: "Failed to query products" });
    }
  }

  try {
    let products = read("products") || [];
    if (q) {
      const qq = q.toLowerCase();
      products = products.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(qq) ||
          (p.description || "").toLowerCase().includes(qq) ||
          (p.tags || []).join(" ").toLowerCase().includes(qq)
      );
    }
    if (category)
      products = products.filter((p) => String(p.category) === category);
    if (min) products = products.filter((p) => Number(p.price) >= min);
    if (max != null) products = products.filter((p) => Number(p.price) <= max);
    if (sort === "price_asc")
      products = products.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc")
      products = products.sort((a, b) => b.price - a.price);
    else
      products = products.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    const start = (page - 1) * limit;
    const end = start + limit;
    return res.json(products.slice(start, end));
  } catch (e) {
    console.error(
      "[products] file store error",
      e && e.message ? e.message : e
    );
    return res.status(500).json({ error: "Failed to load products" });
  }
}

async function getProduct(req, res) {
  const id = req.params.id;
  
  // Try MongoDB first if connected
  if (ProductModel && req.app.locals.dbConnected) {
    try {
        const conds = [];
      if (mongoose.Types.ObjectId.isValid(id)) conds.push({ _id: id });
      const numeric = Number(id);
      if (!isNaN(numeric)) conds.push({ id: numeric });
      conds.push({ slug: id });
      const q = conds.length > 1 ? { $or: conds } : conds[0];
      const p = await ProductModel.findOne(q).lean();
      if (p) return res.json(p);
      // If not found in MongoDB, fall through to JSON
    } catch (e) {
      console.error("[products] get error (db)", e && e.message ? e.message : e);
      // Continue to JSON fallback on error
    }
  }
  
  // Fallback to JSON file
  try {
    const products = read("products") || [];
    const found = products.find(
      (p) => String(p.id) === String(id) || String(p.slug) === String(id)
    );
    if (!found) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json(found);
  } catch (e) {
    console.error("[products] get error (file)", e && e.message ? e.message : e);
    return res.status(500).json({ error: "Failed to fetch product" });
  }
}

async function relatedProducts(req, res) {
  const id = req.params.id;
  try {
    // Try MongoDB first if connected
    if (ProductModel && req.app.locals.dbConnected) {
      try {
        const conds = [];
        if (mongoose.Types.ObjectId.isValid(id)) conds.push({ _id: id });
        const numeric = Number(id);
        if (!isNaN(numeric)) conds.push({ id: numeric });
        conds.push({ slug: id });
        const q = conds.length > 1 ? { $or: conds } : conds[0];
        const main = await ProductModel.findOne(q).lean();
        if (main) {
          const filter = {
            _id: { $ne: main._id },
            status: "active",
            $or: [
              { category: main.category },
              { tags: { $in: main.tags || [] } }
            ]
          };
          const related = await ProductModel.find(filter).limit(8).lean();
          return res.json(related);
        }
        // If not found, fall through to JSON
      } catch (e) {
        console.error("[products] related db error", e && e.message ? e.message : e);
        // Continue to JSON fallback
      }
    }
    
    // Fallback to JSON file
    const products = read("products") || [];
    const main = products.find(
      (p) => String(p.id) === String(id) || String(p.slug) === String(id)
    );
    if (!main) return res.json([]);
    
    const related = products
      .filter(
        (p) =>
          p.id !== main.id &&
          (p.category === main.category ||
            (p.tags || []).some((t) => (main.tags || []).includes(t)))
      )
      .slice(0, 8);
    return res.json(related);
  } catch (e) {
    console.error("[products] related error", e && e.message ? e.message : e);
    return res.status(500).json({ error: "Failed to load related products" });
  }
}

async function listFeaturedProducts(req, res) {
  try {
    if (ProductModel && req.app.locals.dbConnected) {
      const featured = await ProductModel.find({
        isFeatured: true,
        status: "active",
      })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean();
      return res.json(featured);
    }
    const products = read("products") || [];
    const featured = products
      .filter((p) => p.isFeatured && p.status === "active")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12);
    return res.json(featured);
  } catch (e) {
    console.error("[products] featured error", e && e.message ? e.message : e);
    return res.status(500).json({ error: "Failed to load featured products" });
  }
}

async function createProduct(req, res) {
  const p = req.body || {};
  if (ProductModel && req.app.locals.dbConnected) {
    try {
      const product = await ProductModel.create({
        name: p.name || "Untitled",
        price: Number(p.price) || 0,
        image: p.image || "",
        category: p.category || "",
        variants: p.variants || [],
        stock: Number(p.stock) || 0,
        status: p.status || "active",
        slug: p.slug || String(Date.now()),
        metaTitle: p.metaTitle || "",
        metaDescription: p.metaDescription || "",
        description: p.description || "",
      });
      return res.status(201).json(product);
    } catch (err) {
      console.error(
        "[products] db create error:",
        err && err.message ? err.message : err
      );
      return res.status(500).json({ error: "Failed to create product" });
    }
  }

  const products = read("products");
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
}

module.exports = {
  listProducts,
  getProduct,
  relatedProducts,
  listFeaturedProducts,
  createProduct,
};
