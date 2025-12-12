const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const imagesDir = path.resolve(__dirname, '..', '..', 'images');
    if (!fs.existsSync(imagesDir)) return res.json([]);
    const files = fs.readdirSync(imagesDir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext);
    });
    // Return URLs relative to server root
    const urls = files.map(f => `/images/${encodeURIComponent(f)}`);
    res.json(urls);
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : 'Failed' });
  }
});

module.exports = router;
