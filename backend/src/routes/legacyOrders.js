const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const SHEETDB_URL = process.env.SHEETDB_URL || '';

const router = express.Router();

router.post('/orders', async (req, res) => {
  try {
    if (!SHEETDB_URL) return res.status(500).json({ error: 'Orders disabled' });
    const order = req.body || {};
    console.log('[orders] received order:', order);
    try {
      const r = await fetch(SHEETDB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: order })
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        console.error('[orders] SHEETDB error:', r.status, t);
        return res.status(500).json({ error: t || 'SheetDB error' });
      }
      console.log('[orders] order posted to SHEETDB successfully');
      res.json({ ok: true });
    } catch (err) {
      console.error('[orders] failed to post to SHEETDB:', err && err.message ? err.message : err);
      return res.status(500).json({ error: err && err.message ? err.message : 'Failed' });
    }
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : 'Failed' });
  }
});

router.get('/orders/check', async (req, res) => {
  try {
    const tx = String(req.query.transactionId || '').trim();
    if (!SHEETDB_URL || !tx) return res.json({ used: false });
    const r = await fetch(SHEETDB_URL);
    const list = await r.json();
    const used = Array.isArray(list) && list.some((o) => String(o.transactionId || '').trim() === tx);
    res.json({ used });
  } catch (_) {
    res.json({ used: false });
  }
});

module.exports = router;
