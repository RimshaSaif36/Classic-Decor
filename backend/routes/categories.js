const express = require('express');
const { read } = require('../utils/store');

const router = express.Router();

function normalizeCategoryKey(s){
  return String(s||'').toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
}

function displayFromKey(key){
  if (!key) return '';
  return key.split(/[-_]/g).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Return unique categories from products (normalized)
router.get('/', (req, res) => {
  try {
    const products = read('products');
    const map = new Map();
    (products || []).forEach(p => {
      const raw = (p && p.category) ? String(p.category).trim() : '';
      if (!raw) return;
      const key = normalizeCategoryKey(raw);
      if (!key) return;
      const entry = map.get(key) || { id: key, name: displayFromKey(key), rawSamples: new Set(), count: 0 };
      entry.count = (entry.count || 0) + 1;
      entry.rawSamples.add(raw);
      map.set(key, entry);
    });
    const categories = Array.from(map.values()).map(v => ({ id: v.id, name: v.name, count: v.count }));
    res.json(categories);
  } catch (e) {
    res.status(500).json([]);
  }
});

module.exports = router;
