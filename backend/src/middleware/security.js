const helmet = (() => { try { return require('helmet') } catch (e) { return null } })();
const rateLimit = (() => { try { return require('express-rate-limit') } catch (e) { return null } })();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

function setupSecurity(app) {
  // CORS with same origin policy as before
  app.use(cors({
    origin: (origin, callback) => {
      const allowed = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // security headers
  try {
    if (helmet) app.use(helmet());
  } catch (_) {}

  // rate limiting
  try {
    if (rateLimit) app.use(rateLimit({ windowMs: 60 * 1000, max: 300 }));
  } catch (_) {}

  // serve images as before
  try {
    const imagesDir = path.resolve(__dirname, '..', '..', 'frontend', 'images');
    if (fs.existsSync(imagesDir)) {
      app.use('/images', require('express').static(imagesDir));
    }
  } catch (_) {}
}

module.exports = { setupSecurity };
