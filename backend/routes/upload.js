const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

// Use frontend/images directory (same as server.js serves from)
const imagesDir = path.resolve(__dirname, '..', '..', 'frontend', 'images');
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
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

const router = express.Router();

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Check if Cloudinary is configured
    const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
                          process.env.CLOUDINARY_API_KEY && 
                          process.env.CLOUDINARY_API_SECRET;
    
    if (hasCloudinary) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'classic-decor',
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto'
        });
        
        // Delete local file after successful upload
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting local file:', err);
        });
        
        return res.json({ url: result.secure_url });
      } catch (cloudinaryErr) {
        console.error('[upload] Cloudinary error:', cloudinaryErr && cloudinaryErr.message ? cloudinaryErr.message : cloudinaryErr);
        // Fallback to local storage if Cloudinary fails
        const url = '/images/' + encodeURIComponent(req.file.filename);
        return res.json({ url });
      }
    } else {
      // Fallback to local storage
      const url = '/images/' + encodeURIComponent(req.file.filename);
      return res.json({ url });
    }
  } catch (e) {
    console.error('[upload] error:', e && e.message ? e.message : e);
    res.status(500).json({ error: e && e.message ? e.message : 'Failed' });
  }
});

module.exports = router;
