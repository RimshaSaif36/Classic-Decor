const mongoose = require('mongoose');
const ReviewModel = (() => { try { return require('../models/Review') } catch (e) { return null } })();
const { read, write } = require('../utils/store');

async function listReviews(req, res) {
  try {
    const { productId, onlyApproved } = req.query || {};
    if (ReviewModel && mongoose.connection.readyState === 1) {
      const filter = {};
      if (productId) filter.productId = productId;
      if (String(onlyApproved || '').toLowerCase() === 'true') filter.status = 'approved';
      const docs = await ReviewModel.find(filter).sort({ createdAt: -1 }).lean();
      return res.json(docs);
    }

    const list = read('reviews');
    let arr = Array.isArray(list) ? list : [];
    if (productId) arr = arr.filter(r => String(r.productId || '') === String(productId));
    if (String(onlyApproved || '').toLowerCase() === 'true') arr = arr.filter(r => String(r.status || '').toLowerCase() === 'approved');
    return res.json(arr);
  } catch (e) {
    console.error('[reviews] list error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

async function getSummary(req, res) {
  try {
    if (ReviewModel && mongoose.connection.readyState === 1) {
      const arr = await ReviewModel.find({ status: 'approved' }).lean();
      const count = arr.length;
      const avg = count === 0 ? 0 : Math.round((arr.reduce((s, r) => s + Number(r.rating || 0), 0) / count) * 10) / 10;
      return res.json({ count, average: avg });
    }

    const list = read('reviews');
    const arr = Array.isArray(list) ? list.filter(r => String(r.status || '').toLowerCase() === 'approved') : [];
    const count = arr.length;
    const avg = count === 0 ? 0 : Math.round((arr.reduce((s, r) => s + Number(r.rating || 0), 0) / count) * 10) / 10;
    res.json({ count, average: avg });
  } catch (e) {
    console.error('[reviews] summary error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

async function createReview(req, res) {
  try {
    const body = req.body || {};
    const productId = String(body.productId || '').trim();
    const name = String(body.name || '').trim() || 'Anonymous';
    const title = String(body.title || '').trim();
    const comment = String(body.comment || '').trim();
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 0));
    if (!productId) return res.status(400).json({ error: 'productId required' });
    if (!comment) return res.status(400).json({ error: 'comment required' });

    // If user is authenticated, auto-approve; otherwise mark as pending for moderation
    const isAuth = req.user && req.user.id;
    const status = isAuth ? 'approved' : 'pending';
    const approvedAt = isAuth ? new Date() : null;

    if (ReviewModel && mongoose.connection.readyState === 1) {
      const now = new Date();
      const r = new ReviewModel({
        productId,
        rating,
        title,
        comment,
        name,
        userId: isAuth && String(req.user.id).match(/^[0-9a-fA-F]{24}$/) ? req.user.id : null,
        status,
        createdAt: now,
        approvedAt
      });
      await r.save();
      return res.status(201).json(r);
    }

    const list = read('reviews');
    const arr = Array.isArray(list) ? list : [];
    const now = new Date().toISOString();
    const review = {
      id: Date.now(),
      productId,
      rating,
      title,
      comment,
      name,
      userId: body.userId || null,
      status,
      createdAt: now,
      approvedAt: approvedAt ? now : null
    };
    arr.push(review);
    write('reviews', arr);
    res.status(201).json(review);
  } catch (e) {
    console.error('[reviews] create error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

// Admin: update review (e.g., approve/reject)
async function updateReview(req, res) {
  try {
    const id = req.params.id;
    const body = req.body || {};

    if (ReviewModel && mongoose.connection.readyState === 1) {
      const updates = { ...body };
      if (updates.status === 'approved') updates.approvedAt = new Date();
      const conds = [];
      if (mongoose.Types.ObjectId.isValid(id)) conds.push({ _id: id });
      const numeric = Number(id);
      if (!isNaN(numeric)) conds.push({ id: numeric });
      const query = conds.length > 1 ? { $or: conds } : conds[0];
      const updated = await ReviewModel.findOneAndUpdate(query, updates, { new: true }).lean();
      if (!updated) return res.status(404).json({ error: 'Not found' });
      return res.json(updated);
    }

    const list = read('reviews') || [];
    const idx = list.findIndex(r => String(r.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    list[idx] = { ...list[idx], ...body };
    if (list[idx].status === 'approved' && !list[idx].approvedAt) list[idx].approvedAt = new Date().toISOString();
    write('reviews', list);
    res.json(list[idx]);
  } catch (e) {
    console.error('[reviews] update error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
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
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(204).end();
    }

    const list = read('reviews') || [];
    const next = list.filter(r => String(r.id) !== String(id));
    write('reviews', next);
    res.status(204).end();
  } catch (e) {
    console.error('[reviews] delete error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

module.exports = { listReviews, getSummary, createReview, updateReview, deleteReview }
