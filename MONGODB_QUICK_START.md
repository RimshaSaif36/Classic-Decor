# MongoDB Integration - Quick Start Guide 🚀

## 5-Minute Setup

### Step 1: Get MongoDB Connection String (2 min)

**Choose one option:**

**Option A: MongoDB Atlas (Cloud - Recommended)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free tier available)
3. Create a Cluster → Choose "Create Free"
4. Create Database User (remember username & password)
5. Get Connection String: Click "Connect" → "Drivers" → Copy the URI
6. Replace `<password>` and `<database>` in the string

**Option B: MongoDB Local**
```
mongodb://localhost:27017/classic-decor
```
(Requires MongoDB installed locally)

---

### Step 2: Setup .env File (1 min)

Create `backend/.env` file:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/classic-decor?retryWrites=true&w=majority

PORT=3001
STRIPE_SECRET_KEY=your_stripe_key
FRONTEND_URL=http://localhost:5173
STRIPE_CURRENCY=usd
FX_PKR_TO_USD=0.0036
```

---

### Step 3: Test Connection (1 min)

```bash
cd backend
npm install
npm run test:mongo
```

You should see:
```
✅ Successfully connected to MongoDB!
```

---

### Step 4: Migrate Data (1 min)

Move data from JSON files to MongoDB:

```bash
npm run migrate:mongo
```

You'll see:
```
✅ Migrated 10 users
✅ Migrated 50 products
✅ Migrated 20 reviews
✅ MongoDB Migration Complete!
```

---

### Step 5: Start Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Visit: http://localhost:5173

---

## What Just Happened?

✅ **Data moved from JSON to MongoDB**
- `backend/data/users.json` → MongoDB
- `backend/data/products.json` → MongoDB
- `backend/data/reviews.json` → MongoDB

✅ **Automatic fallback setup**
- If MongoDB disconnects, falls back to JSON files
- No data loss, seamless experience

✅ **Production ready**
- All models have proper validation
- Password hashing enabled
- Timestamps included

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "MONGODB_URI not set" | Add `MONGODB_URI` to `backend/.env` |
| "Connection refused" | Check MongoDB is running locally, or check Atlas IP whitelist |
| "Invalid credentials" | Verify username/password in URI |
| "ENOTFOUND" | Check cluster name in connection string |

---

## Available Commands

```bash
# Test MongoDB connection
npm run test:mongo

# Migrate data to MongoDB (run once)
npm run migrate:mongo

# Start development server
npm run dev

# Start production server
npm start

# Seed products (JSON files)
npm run seed

# Seed all data (JSON files)
npm run seed:all
```

---

## Next Steps (Optional)

1. **Delete JSON files** after confirming data:
   ```bash
   rm backend/data/users.json
   rm backend/data/products.json
   rm backend/data/reviews.json
   ```

2. **Setup backup** for MongoDB
3. **Configure indexes** for performance
4. **Add validation** rules

---

## MongoDB Dashboard

View your data:
1. Go to MongoDB Atlas: https://www.mongodb.com/cloud/atlas
2. Click your cluster → Collections
3. Browse your data!

---

## Files Created for MongoDB

- ✅ `backend/scripts/migrateToMongo.js` - Migration script
- ✅ `backend/scripts/testMongoConnection.js` - Connection tester
- ✅ `backend/.env.example` - Environment template
- ✅ Models already exist: User, Product, Review, Order

---

## Your Data is Safe! 🔒

- Passwords are hashed with bcryptjs
- Timestamps tracked (createdAt, updatedAt)
- Unique constraints on emails
- No data loss during migration

---

**You're all set! 🎉 Your Classic Decor app now uses MongoDB!**

Have questions? Check `MONGODB_SETUP.md` for detailed info.
