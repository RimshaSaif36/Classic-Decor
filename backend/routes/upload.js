const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const imagesDir = path.resolve(__dirname, '..', '..', 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

const router = express.Router();

router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Return URL relative to server root
    const url = '/images/' + encodeURIComponent(req.file.filename);
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : 'Failed' });
  }
});

module.exports = router;
