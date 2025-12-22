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

    if (ReviewModel && mongoose.connection.readyState === 1) {
      const now = new Date();
      const r = new ReviewModel({ productId, rating, title, comment, name, userId: req.user && req.user.id && String(req.user.id).match(/^[0-9a-fA-F]{24}$/) ? req.user.id : null, status: 'approved', createdAt: now, approvedAt: now });
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
      status: 'approved',
      createdAt: now,
      approvedAt: now
    };
    arr.push(review);
    write('reviews', arr);
    res.status(201).json(review);
  } catch (e) {
    console.error('[reviews] create error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

module.exports = { listReviews, getSummary, createReview };