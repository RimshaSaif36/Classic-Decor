const mongoose = require('mongoose');

async function connectDB(app) {
  const MONGODB_URI = process.env.MONGODB_URI || '';
  if (!MONGODB_URI) {
    app.locals.dbConnected = false;
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    app.locals.dbConnected = true;
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err && err.message ? err.message : err);
    app.locals.dbConnected = false;
  }
}

module.exports = { connectDB, mongoose };
