require('dotenv').config();
const mongoose = require('mongoose');
const { read } = require('../utils/store');
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');

const MONGODB_URI = process.env.MONGODB_URI || '';

async function migrate() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('\nClearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Review.deleteMany({}),
      Order.deleteMany({})
    ]);
    console.log('✅ Collections cleared');

    // Migrate Users
    console.log('\nMigrating users...');
    const users = read('users') || [];
    if (users.length > 0) {
      const mappedUsers = users.map(u => ({
        legacyId: u.id,
        name: u.name,
        email: u.email ? u.email.toLowerCase() : `user${u.id}@classic-decor.com`,
        password: u.password || 'migrated@123',
        phone: u.phone || '',
        role: u.role || 'user',
        createdAt: u.createdAt || new Date(),
        updatedAt: u.updatedAt || new Date()
      }));
      
      // Use insertMany with bypassDocumentValidation to skip pre-save hooks if needed
      await User.insertMany(mappedUsers, { ordered: false }).catch(err => {
        console.warn('⚠️  Some users failed to migrate:', err.message);
      });
      console.log(`✅ Migrated ${users.length} users`);
    } else {
      console.log('⚠️  No users to migrate');
    }

    // Migrate Products
    console.log('\nMigrating products...');
    const products = read('products') || [];
    if (products.length > 0) {
      await Product.insertMany(products, { ordered: false }).catch(err => {
        console.warn('⚠️  Some products failed to migrate:', err.message);
      });
      console.log(`✅ Migrated ${products.length} products`);
    } else {
      console.log('⚠️  No products to migrate');
    }

    // Migrate Reviews
    console.log('\nMigrating reviews...');
    const reviews = read('reviews') || [];
    if (reviews.length > 0) {
      await Review.insertMany(reviews, { ordered: false }).catch(err => {
        console.warn('⚠️  Some reviews failed to migrate:', err.message);
      });
      console.log(`✅ Migrated ${reviews.length} reviews`);
    } else {
      console.log('⚠️  No reviews to migrate');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ MongoDB Migration Complete!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. Verify data in MongoDB Atlas dashboard');
    console.log('2. Run: npm run dev (to start backend)');
    console.log('3. Test API endpoints');
    console.log('4. Once verified, you can delete JSON files in backend/data/');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
console.log('Starting MongoDB migration...\n');
migrate();
