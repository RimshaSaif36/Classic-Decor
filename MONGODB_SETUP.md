# MongoDB Integration Guide - Classic Decor

## Overview
Your project is already partially configured for MongoDB! The models are defined with Mongoose schemas. This guide will help you complete the MongoDB integration.

---

## Step 1: Get MongoDB URI

### Option A: MongoDB Atlas (Cloud - Recommended)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new project
4. Create a Cluster (choose Free tier)
5. Create a Database User with username and password
6. Get the connection string
7. Replace `<password>` with your user password
8. Connection string format: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority`

### Option B: MongoDB Community (Local)
1. Install MongoDB from https://www.mongodb.com/try/download/community
2. Start MongoDB service
3. Connection string: `mongodb://localhost:27017/classic-decor`

---

## Step 2: Setup Environment Variables

Create or update `.env` file in the `backend/` folder:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/classic-decor?retryWrites=true&w=majority

# Other existing variables
PORT=3001
STRIPE_SECRET_KEY=your_stripe_key
FRONTEND_URL=http://localhost:5173
STRIPE_CURRENCY=usd
FX_PKR_TO_USD=0.0036
```

---

## Step 3: Verify Dependencies

Your `package.json` already has:
- ✅ `mongoose` (^6.13.0)
- ✅ `bcryptjs` (for password hashing)
- ✅ `dotenv` (for environment variables)

---

## Step 4: Models Already Created

Your models in `backend/models/` are already Mongoose schemas:
- ✅ `User.js` - User schema with password hashing
- ✅ `Product.js` - Product schema with variants
- ✅ `Order.js` - Order schema
- ✅ `Review.js` - Review schema

---

## Step 5: Migrate Data from JSON to MongoDB

### Option A: Automatic Migration Script (Run Once)

Create `backend/scripts/migrateToMongo.js`:

```javascript
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

    // Clear existing data (optional)
    console.log('Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Review.deleteMany({}),
      Order.deleteMany({})
    ]);

    // Migrate Users
    const users = read('users') || [];
    if (users.length > 0) {
      const mappedUsers = users.map(u => ({
        legacyId: u.id,
        name: u.name,
        email: u.email.toLowerCase(),
        password: u.password,
        phone: u.phone || '',
        role: u.role || 'user',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));
      await User.insertMany(mappedUsers);
      console.log(`✅ Migrated ${users.length} users`);
    }

    // Migrate Products
    const products = read('products') || [];
    if (products.length > 0) {
      await Product.insertMany(products);
      console.log(`✅ Migrated ${products.length} products`);
    }

    // Migrate Reviews
    const reviews = read('reviews') || [];
    if (reviews.length > 0) {
      await Review.insertMany(reviews);
      console.log(`✅ Migrated ${reviews.length} reviews`);
    }

    console.log('\n✅ Migration complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
```

**Run migration:**
```bash
cd backend
node scripts/migrateToMongo.js
```

---

## Step 6: Update Controllers (Most are already updated!)

### Already Good ✅
- `ordersController.js` - Uses MongoDB when available
- `usersController.js` - Uses MongoDB when available
- `productsController.js` - Uses MongoDB when available

### Review and Test
Run these commands:
```bash
cd backend
npm install
npm run dev
```

Visit endpoints to test:
- http://localhost:3001/api/products
- http://localhost:3001/api/users
- http://localhost:3001/api/orders

---

## Step 7: Frontend Configuration (No Changes Needed)

Your React frontend connects to the backend via API calls. No changes needed!

---

## Verification Checklist

- [ ] Set MONGODB_URI in `.env`
- [ ] Run `npm install` in backend
- [ ] Run migration script: `node scripts/migrateToMongo.js`
- [ ] Start backend: `npm run dev`
- [ ] Test API endpoints
- [ ] Start frontend: `npm run dev`
- [ ] Test full application flow

---

## Troubleshooting

### MongoDB Connection Failed
- Check MONGODB_URI in `.env`
- Verify MongoDB server is running (if local)
- Check username/password (if Atlas)
- Ensure IP whitelist in MongoDB Atlas (if cloud)

### Migration Errors
- Ensure JSON files exist in `backend/data/`
- Check duplicate emails (emails must be unique in User model)
- Run `node scripts/migrateToMongo.js` only once

### Backend Won't Start
- Ensure all dependencies: `npm install`
- Check Node version: `node --version` (use 14+)
- Clear node_modules and reinstall if needed

---

## Next Steps (Optional)

1. **Remove JSON files** after confirming MongoDB works
2. **Add MongoDB backup** strategy
3. **Setup proper indexes** in MongoDB for performance
4. **Add data validation** in controllers
5. **Implement pagination** for large collections

---

## Key Files Modified
- `backend/.env` - Add MONGODB_URI
- `backend/scripts/migrateToMongo.js` - New migration script (you'll create this)
- Everything else works as-is!

---

**Your project is ready for MongoDB!** 🎉
