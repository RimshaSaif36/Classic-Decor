require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || '';
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in env');
  process.exit(1);
}

const User = require('../models/User');
const Review = require('../models/Review');

async function run() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for seeding users/reviews');

  // Users
  const usersFile = path.resolve(__dirname, '..', 'data', 'users.json');
  if (!fs.existsSync(usersFile)) {
    console.warn('users.json not found, skipping users seed');
  } else {
    const raw = fs.readFileSync(usersFile, 'utf8');
    const users = JSON.parse(raw);
    if (Array.isArray(users) && users.length) {
      await User.deleteMany({});
      const docs = users.map(u => ({
        legacyId: u.id,
        name: u.name || 'Unnamed',
        email: (u.email || '').toLowerCase(),
        password: u.password || '',
        phone: u.phone || '',
        role: u.role || 'user',
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
      }));
      await User.insertMany(docs);
      console.log('Seeded', docs.length, 'users');
    }
  }

  // Reviews
  const reviewsFile = path.resolve(__dirname, '..', 'data', 'reviews.json');
  if (!fs.existsSync(reviewsFile)) {
    console.warn('reviews.json not found, skipping reviews seed');
  } else {
    const raw = fs.readFileSync(reviewsFile, 'utf8');
    const reviews = JSON.parse(raw);
    if (Array.isArray(reviews) && reviews.length) {
      await Review.deleteMany({});
      const docs = reviews.map(r => ({
        productId: r.productId,
        rating: Number(r.rating) || 5,
        title: r.title || '',
        comment: r.comment || '',
        name: r.name || 'Anonymous',
        userId: null,
        status: r.status || 'approved',
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        approvedAt: r.approvedAt ? new Date(r.approvedAt) : new Date()
      }));
      await Review.insertMany(docs);
      console.log('Seeded', docs.length, 'reviews');
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});