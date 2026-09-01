const mongoose = require("mongoose");
const ReviewModel = (() => {
  try {
    return require("../models/Review");
  } catch (e) {
    return null;
  }
})();
const { read, write } = require("../utils/store");
const OrderModel = (() => {
  try {
    return require("../models/Order");
  } catch (e) {
    return null;
  }
})();
const UserModel = (() => {
  try {
    return require("../models/User");
  } catch (e) {
    return null;
  }
})();

function orderContainsProduct(order, productId) {
  const target = String(productId || "").trim();
  const items = Array.isArray(order && order.items) ? order.items : [];

  return items.some((item) => {
    const candidates = [
      item && item.productId,
      item && item.id,
      item && item._id,
      item && item.slug,
    ];
    return candidates.some((value) => String(value || "").trim() === target);
  });
}

async function getReviewerIdentity(userId) {
  const normalizedUserId = String(userId || "").trim();
  const orConditions = [];
  let legacyUserId = null;

  if (normalizedUserId && normalizedUserId.match(/^[0-9a-fA-F]{24}$/)) {
    orConditions.push({ userId: normalizedUserId });
  }

  if (normalizedUserId && !isNaN(Number(normalizedUserId))) {
    legacyUserId = Number(normalizedUserId);
    orConditions.push({ legacyUserId });
  }

  let email = "";
  let name = "";

  if (UserModel && mongoose.connection.readyState === 1) {
    let user = null;
    if (normalizedUserId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await UserModel.findById(normalizedUserId)
        .select("email name")
        .lean();
    } else if (!isNaN(Number(normalizedUserId))) {
      user = await UserModel.findOne({ legacyId: Number(normalizedUserId) })
        .select("email name")
        .lean();
    }
    email = String(user && user.email ? user.email : "").toLowerCase();
    name = String(user && user.name ? user.name : "").trim();
  } else {
    const users = read("users") || [];
    const found = users.find((entry) => String(entry.id) === normalizedUserId);
    email = String(found && found.email ? found.email : "").toLowerCase();
    name = String(found && found.name ? found.name : "").trim();
  }

  if (email) {
    orConditions.push({
      email: new RegExp(
        `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i",
      ),
    });
  }

  return { orConditions, name, email, legacyUserId };
}

async function listReviews(req, res) {
  try {
    const { productId, onlyApproved } = req.query || {};
    if (ReviewModel && mongoose.connection.readyState === 1) {
      const filter = {};
      if (productId) filter.productId = productId;
      if (String(onlyApproved || "").toLowerCase() === "true")
        filter.status = "approved";
      const docs = await ReviewModel.find(filter)
        .sort({ createdAt: -1 })
        .lean();
      return res.json(docs);
    }

    const list = read("reviews");
    let arr = Array.isArray(list) ? list : [];
    if (productId)
      arr = arr.filter((r) => String(r.productId || "") === String(productId));
    if (String(onlyApproved || "").toLowerCase() === "true")
      arr = arr.filter(
        (r) => String(r.status || "").toLowerCase() === "approved",
      );
    return res.json(arr);
  } catch (e) {
    console.error("[reviews] list error", e && e.message ? e.message : e);
    res.status(500).json({ error: "Failed" });
  }
}

async function getSummary(req, res) {
  try {
    if (ReviewModel && mongoose.connection.readyState === 1) {
      const arr = await ReviewModel.find({ status: "approved" }).lean();
      const count = arr.length;
      const avg =
        count === 0
          ? 0
          : Math.round(
              (arr.reduce((s, r) => s + Number(r.rating || 0), 0) / count) * 10,
            ) / 10;
      return res.json({ count, average: avg });
    }

    const list = read("reviews");
    const arr = Array.isArray(list)
      ? list.filter((r) => String(r.status || "").toLowerCase() === "approved")
      : [];
    const count = arr.length;
    const avg =
      count === 0
        ? 0
        : Math.round(
            (arr.reduce((s, r) => s + Number(r.rating || 0), 0) / count) * 10,
          ) / 10;
    res.json({ count, average: avg });
  } catch (e) {
    console.error("[reviews] summary error", e && e.message ? e.message : e);
    res.status(500).json({ error: "Failed" });
  }
}

async function createReview(req, res) {
  try {
    const body = req.body || {};
    const productId = String(body.productId || "").trim();
    const title = String(body.title || "").trim();
    const comment = String(body.comment || "").trim();
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 0));
    if (!productId)
      return res.status(400).json({ error: "productId required" });
    if (!comment) return res.status(400).json({ error: "comment required" });
    if (!req.user || !req.user.id)
      return res.status(401).json({ error: "Unauthorized" });

    if (!OrderModel || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Order verification unavailable" });
    }

    const {
      orConditions,
      name: accountName,
      email: reviewerEmail,
      legacyUserId,
    } = await getReviewerIdentity(req.user.id);
    if (orConditions.length === 0) {
      return res
        .status(403)
        .json({
          error: "Only customers who ordered this product can review it",
        });
    }

    const orders = await OrderModel.find({ $or: orConditions })
      .select("items")
      .lean();
    const hasPurchasedProduct = orders.some((order) =>
      orderContainsProduct(order, productId),
    );

    if (!hasPurchasedProduct) {
      return res
        .status(403)
        .json({
          error: "Only customers who ordered this product can review it",
        });
    }

    const existingReviewQuery = { productId, $or: orConditions };

    if (ReviewModel && mongoose.connection.readyState === 1) {
      const existingReview = await ReviewModel.findOne(existingReviewQuery)
        .select("_id")
        .lean();
      if (existingReview) {
        return res
          .status(409)
          .json({ error: "You have already reviewed this product" });
      }
    } else {
      const list = read("reviews") || [];
      const hasExistingReview = list.some((review) => {
        if (String(review.productId || "").trim() !== productId) return false;

        if (
          String(review.userId || "").trim() ===
          String(req.user.id || "").trim()
        )
          return true;
        if (
          legacyUserId !== null &&
          Number(review.legacyUserId) === legacyUserId
        )
          return true;
        if (
          reviewerEmail &&
          String(review.reviewerEmail || "")
            .trim()
            .toLowerCase() === reviewerEmail
        )
          return true;

        return false;
      });

      if (hasExistingReview) {
        return res
          .status(409)
          .json({ error: "You have already reviewed this product" });
      }
    }

    const name = accountName || String(body.name || "").trim() || "Anonymous";

    const status = "approved";
    const approvedAt = new Date();

    if (ReviewModel && mongoose.connection.readyState === 1) {
      const now = new Date();
      const r = new ReviewModel({
        productId,
        rating,
        title,
        comment,
        name,
        userId: String(req.user.id).match(/^[0-9a-fA-F]{24}$/)
          ? req.user.id
          : null,
        legacyUserId,
        reviewerEmail,
        status,
        createdAt: now,
        approvedAt,
      });
      await r.save();
      return res.status(201).json(r);
    }

    const list = read("reviews");
    const arr = Array.isArray(list) ? list : [];
    const now = new Date().toISOString();
    const review = {
      id: Date.now(),
      productId,
      rating,
      title,
      comment,
      name,
      userId: req.user.id || null,
      legacyUserId,
      reviewerEmail,
      status,
      createdAt: now,
      approvedAt: now,
    };
    arr.push(review);
    write("reviews", arr);
    res.status(201).json(review);
  } catch (e) {
    console.error("[reviews] create error", e && e.message ? e.message : e);
    res.status(500).json({ error: "Failed" });
  }
}

// Admin: update review (e.g., approve/reject)
async function updateReview(req, res) {
  try {
    const id = req.params.id;
    const body = req.body || {};

    if (ReviewModel && mongoose.connection.readyState === 1) {
      const updates = { ...body };
      if (updates.status === "approved") updates.approvedAt = new Date();
      const conds = [];
      if (mongoose.Types.ObjectId.isValid(id)) conds.push({ _id: id });
      const numeric = Number(id);
      if (!isNaN(numeric)) conds.push({ id: numeric });
      const query = conds.length > 1 ? { $or: conds } : conds[0];
      const updated = await ReviewModel.findOneAndUpdate(query, updates, {
        new: true,
      }).lean();
      if (!updated) return res.status(404).json({ error: "Not found" });
      return res.json(updated);
    }

    const list = read("reviews") || [];
    const idx = list.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    list[idx] = { ...list[idx], ...body };
    if (list[idx].status === "approved" && !list[idx].approvedAt)
      list[idx].approvedAt = new Date().toISOString();
    write("reviews", list);
    res.json(list[idx]);
  } catch (e) {
    console.error("[reviews] update error", e && e.message ? e.message : e);
    res.status(500).json({ error: "Failed" });
  }
}

// Admin: delete review
async function deleteReview(req, res) {
  try {
    const id = req.params.id;
    if (ReviewModel && mongoose.connection.readyState === 1) {
      const conds = [];
      if (mongoose.Types.ObjectId.isValid(id)) conds.push({ _id: id });
      const numeric = Number(id);
      if (!isNaN(numeric)) conds.push({ id: numeric });
      const query = conds.length > 1 ? { $or: conds } : conds[0];
      const result = await ReviewModel.deleteOne(query);
      if (result.deletedCount === 0)
        return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    const list = read("reviews") || [];
    const next = list.filter((r) => String(r.id) !== String(id));
    write("reviews", next);
    res.status(204).end();
  } catch (e) {
    console.error("[reviews] delete error", e && e.message ? e.message : e);
    res.status(500).json({ error: "Failed" });
  }
}

module.exports = {
  listReviews,
  getSummary,
  createReview,
  updateReview,
  deleteReview,
};
