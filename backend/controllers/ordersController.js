const mongoose = require('mongoose');
const { sendOrderConfirmation } = require('../utils/mailer');
const Joi = require('joi');
const OrderModel = (() => { try { return require('../models/Order') } catch (e) { return null } })();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const SHEETDB_URL = process.env.SHEETDB_URL || '';

async function createOrder(req, res) {
  try {
    const body = req.body || {};
    if (OrderModel && mongoose.connection.readyState === 1) {
      const doc = new OrderModel({
        userId: req.user && req.user.id && String(req.user.id).match(/^[0-9a-fA-F]{24}$/) ? req.user.id : null,
        name: body.name,
        address: body.address,
        phone: body.phone,
        items: body.items || [],
        subtotal: Number(body.subtotal) || 0,
        shipping: Number(body.shipping) || 0,
        total: Number(body.total) || 0,
        paymentStatus: body.paymentStatus || 'pending',
        transactionId: body.transactionId || '',
        metadata: body.metadata || {}
      });
      await doc.save();
      return res.status(201).json(doc);
    }

    // fallback to SHEETDB (existing behavior)
    if (!SHEETDB_URL) return res.status(500).json({ error: 'Orders disabled' });
    try {
      const r = await fetch(SHEETDB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: body })
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        return res.status(500).json({ error: t || 'SheetDB error' });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error('[orders] SHEETDB error', err && err.message ? err.message : err);
      return res.status(500).json({ error: 'Failed' });
    }
  } catch (e) {
    console.error('[orders] create error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

async function listOrders(req, res) {
  try {
    if (OrderModel && mongoose.connection.readyState === 1) {
      const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
      return res.json(docs);
    }
    return res.status(501).json({ error: 'Orders listing requires DB' });
  } catch (e) {
    console.error('[orders] list error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

async function getOrder(req, res) {
  try {
    const id = req.params.id;
    if (OrderModel && mongoose.connection.readyState === 1) {
      const doc = await OrderModel.findById(id).lean();
      if (!doc) return res.status(404).json({ error: 'Not found' });
      // allow owner or admin - middleware should enforce
      return res.json(doc);
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('[orders] get error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

// Public endpoint to check whether a transactionId has been used
async function checkTransaction(req, res) {
  try {
    const tx = String(req.query.transactionId || '').trim();
    if (!tx) return res.json({ used: false });

    // If we have DB, check orders collection
    if (OrderModel && mongoose.connection.readyState === 1) {
      const found = await OrderModel.findOne({ transactionId: tx }).lean();
      return res.json({ used: !!found });
    }

    // Fallback to SHEETDB if configured
    if (!SHEETDB_URL) return res.json({ used: false });
    try {
      const r = await fetch(SHEETDB_URL);
      const list = await r.json();
      const used = Array.isArray(list) && list.some((o) => String(o.transactionId || '').trim() === tx);
      return res.json({ used });
    } catch (e) {
      return res.json({ used: false });
    }
  } catch (e) {
    return res.json({ used: false });
  }
}

async function myOrders(req, res) {
  try {
    if (OrderModel && mongoose.connection.readyState === 1) {
      const docs = await OrderModel.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
      return res.json(docs);
    }
    return res.status(501).json({ error: 'User orders require DB' });
  } catch (e) {
    console.error('[orders] myOrders error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

module.exports = { createOrder, listOrders, getOrder, checkTransaction, myOrders };