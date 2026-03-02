const express = require('express');
const Stripe = (() => { try { return require('stripe') } catch (e) { return null } })();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const { computeShipping } = (() => {
  try { return require('../../utils/shipping'); } catch (e) { try { return require('../../../backend/utils/shipping'); } catch (e2) { return { computeShipping: (s)=> (Number(s)>5000?0:200) }; } }
})();
const router = express.Router();
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY ? Stripe(STRIPE_SECRET_KEY) : null;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:5173`;
const SHEETDB_URL = process.env.SHEETDB_URL || '';
const PORT = process.env.PORT || 3001;
const FX_PKR_TO_USD = Number(process.env.FX_PKR_TO_USD || process.env.EXCHANGE_PKR_TO_USD || 0.0036);
const CURRENCY = process.env.STRIPE_CURRENCY || 'usd';

router.get('/config-status', (req, res) => {
  res.json({ stripe_configured: !!STRIPE_SECRET_KEY, currency: CURRENCY });
});

router.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

    const { name, address, phone, cart, shipping } = req.body || {};
    if (!Array.isArray(cart) || cart.length === 0) return res.status(400).json({ error: 'Cart required' });

    const isPKR = String(CURRENCY).toLowerCase() === 'pkr';
    function toUnitAmount(price, curr) {
      const n = Number(price) || 0;
      if (isPKR && curr === 'usd') return Math.max(50, Math.round(n * FX_PKR_TO_USD * 100));
      return Math.round(n * 100);
    }
    function buildLineItems(curr) {
      const items = cart.map((item) => ({
        price_data: {
          currency: curr,
          product_data: { name: item.name },
          unit_amount: toUnitAmount(item.price, curr)
        },
        quantity: Number(item.quantity) || 1
      }));
      const subtotal = cart.reduce((s,i)=>s+Number(i.price)*Number(i.quantity),0);
      const shippingFee = computeShipping(subtotal);

      if (shippingFee && Number(shippingFee) > 0) {
        items.push({
          price_data: {
            currency: curr,
            product_data: { name: 'Shipping' },
            unit_amount: toUnitAmount(Number(shippingFee), curr)
          },
          quantity: 1
        });
      }
      return items;
    }

    const order = {
      name,
      address,
      phone,
      items: cart.map(i => `${i.name} x ${i.quantity} (PKR ${i.price})${i.size ? ' | size: '+i.size : ''}${i.color ? ' | color: '+i.color : ''}`).join(', '),
      sizes: cart.map(i => i.size || '').filter(Boolean).join(', '),
      colors: cart.map(i => i.color || '').filter(Boolean).join(', '),
      subtotal,
      shipping: Number(shippingFee)||0,
      total: subtotal + (Number(shippingFee)||0),
      date: new Date().toLocaleString()
    };

    async function createSession(curr) {
      return stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: buildLineItems(curr),
        success_url: `http://localhost:${PORT}/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:${PORT}/stripe-cancel`,
        metadata: { order: JSON.stringify(order) }
      });
    }

    try {
      const firstCurrency = isPKR ? 'usd' : CURRENCY;
      const s = await createSession(firstCurrency);
      return res.json({ url: s.url });
    } catch (e1) {
      try {
        const s2 = await createSession('usd');
        return res.json({ url: s2.url });
      } catch (e2) {
        return res.status(500).json({ error: e1?.message || 'Failed to create session' });
      }
    }
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed to create session' });
  }
});

router.get('/stripe-success', async (req, res) => {
  try {
    if (!stripe) return res.status(500).send('Stripe not configured');
    const id = req.query.session_id;
    if (!id) return res.status(400).send('Missing session_id');
    const session = await stripe.checkout.sessions.retrieve(id);
    if (session.payment_status === 'paid') {
      const meta = session.metadata || {};
      const order = meta.order ? JSON.parse(meta.order) : null;
      if (order) {
        try {
          console.log('[stripe-success] posting order to SHEETDB', order);
          const r = await fetch(SHEETDB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: order })
          });
          if (!r.ok) {
            const txt = await r.text().catch(() => '');
            console.error('[stripe-success] SHEETDB responded with non-ok:', r.status, txt);
          } else {
            console.log('[stripe-success] posted order to SHEETDB successfully');
          }
        } catch (err) {
          console.error('[stripe-success] failed posting order to SHEETDB:', err && err.message ? err.message : err);
        }
      }
      return res.redirect(`${FRONTEND_URL}/success?session_id=${id}`);
    }
    res.redirect('/index.html?cancel=1');
  } catch (_) {
    res.redirect('/index.html?cancel=1');
  }
});

router.get('/stripe-order', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const id = req.query.session_id;
    if (!id) return res.status(400).json({ error: 'Missing session_id' });
    const session = await stripe.checkout.sessions.retrieve(id);
    const meta = session.metadata || {};
    const order = meta.order ? JSON.parse(meta.order) : null;
    res.json({ payment_status: session.payment_status, amount_total: session.amount_total, currency: session.currency, order });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed' });
  }
});

module.exports = router;
