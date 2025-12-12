const express = require('express');
const { read, write } = require('../utils/store');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const products = read('products');
  res.json(products);
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const products = read('products');
  const p = req.body || {};
  const id = Date.now();
  const product = {
    id,
    name: p.name || 'Untitled',
    price: Number(p.price) || 0,
    image: p.image || '',
    category: p.category || '',
    variants: p.variants || [],
    stock: Number(p.stock) || 0,
    status: p.status || 'active',
    slug: p.slug || String(id),
    metaTitle: p.metaTitle || '',
    metaDescription: p.metaDescription || '',
    createdAt: new Date().toISOString()
  };
  products.push(product);
  write('products', products);
  res.status(201).json(product);
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const products = read('products');
  const id = Number(req.params.id);
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  products[idx] = { ...products[idx], ...req.body, id };
  write('products', products);
  res.json(products[idx]);
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const products = read('products');
  const id = Number(req.params.id);
  const next = products.filter(p => p.id !== id);
  write('products', next);
  res.status(204).end();
});

module.exports = router;
