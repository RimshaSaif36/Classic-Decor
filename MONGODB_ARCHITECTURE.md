# MongoDB Architecture - Classic Decor Project

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   CLASSIC DECOR APPLICATION                  │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
           ┌────▼─────┐  ┌────▼─────┐  ┌──▼──────┐
           │ Frontend  │  │  Backend  │  │ MongoDB │
           │  (React)  │  │(Express)  │  │(Cloud)  │
           └──────────┘  └───────────┘  └─────────┘
                │             │              │
              :5173         :3001          Atlas
              Vite        Nodemon         Cluster
```

---

## Data Flow

### 1. User Creates Account
```
React Form → Backend API → Mongoose Schema → MongoDB
                 ↓ (if DB fails)
            Fallback to JSON
```

### 2. Products Display
```
Frontend Request → Express Controller → Mongoose Query → MongoDB
                        ↓ (filters, search)
                    Product Model
```

### 3. Order Creation
```
Cart Submission → createOrder() → OrderModel.save() → MongoDB
                    ↓ (pre-save hooks)
                  Validation
```

---

## Data Models

### User Schema
```javascript
{
  _id: ObjectId,           // MongoDB ID
  legacyId: Number,        // Old ID from JSON (indexed)
  name: String,            // Required
  email: String,           // Unique, indexed
  password: String,        // Hashed (bcryptjs)
  phone: String,           // Optional
  role: 'user' | 'admin',  // Default: 'user'
  createdAt: Date,         // Auto
  updatedAt: Date          // Auto
}
```

### Product Schema
```javascript
{
  _id: ObjectId,
  name: String,            // Required
  price: Number,           // Default: 0
  image: String,           // URL
  category: String,        // Indexed for filtering
  variants: [
    {
      name: String,
      price: Number,
      sku: String,
      stock: Number
    }
  ],
  stock: Number,
  status: 'active' | 'inactive',
  slug: String,            // Indexed for URLs
  description: String,     // Full description
  tags: [String],          // For filtering
  colors: [String],        // Color options
  sizes: [String],         // Size options
  isFeatured: Boolean,     // Homepage display
  createdAt: Date
}
```

### Order Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId,        // Reference to User (if logged in)
  name: String,
  address: String,
  phone: String,
  items: [
    {
      productId: String,
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  subtotal: Number,
  shipping: Number,
  total: Number,
  paymentStatus: 'pending' | 'completed' | 'failed',
  transactionId: String,   // Stripe transaction ID
  metadata: Object,        // Extra info
  createdAt: Date,
  updatedAt: Date
}
```

### Review Schema
```javascript
{
  _id: ObjectId,
  productId: String,       // Which product
  userId: ObjectId,        // Who reviewed (optional)
  rating: Number,          // 1-5
  comment: String,
  createdAt: Date
}
```

---

## Controllers Using MongoDB

### Products Controller
```javascript
// listProducts() - Queries MongoDB with filters
// - Search by name/description (text index)
// - Filter by category (indexed field)
// - Filter by price range
// - Sort by price/date
// - Pagination support

// getProduct() - Finds by slug or ID
// - Text search fallback
```

### Users Controller
```javascript
// getMe() - Gets current user
// - Try MongoDB first (by ObjectId)
// - Fallback to legacyId (from JSON migration)

// listUsers() - Gets all users (admin only)
// - Excludes password field
// - Returns public info only
```

### Orders Controller
```javascript
// createOrder() - Saves new order to MongoDB
// - Associates with userId if logged in
// - Stores payment info
// - Triggers email confirmation

// listOrders() - Gets all orders
// - MongoDB first
// - SHEETDB fallback (legacy)
```

---

## Database Connection Flow

```javascript
// server.js startup
1. Load environment variables (MONGODB_URI)
2. Connect to MongoDB if URI exists
3. Set app.locals.dbConnected = true/false
4. Controllers check this flag

// Controller logic
if (Model && app.locals.dbConnected) {
  // Use MongoDB
  const doc = await Model.find(query);
} else {
  // Fallback to JSON files
  const data = read('collection');
}
```

---

## Indexes for Performance

MongoDB automatically creates:
- `_id` - Primary key (unique)
- `email` (User) - For login, must be unique
- `category` (Product) - For filtering
- `slug` (Product) - For URL lookups
- Text index (Product) - For search queries

---

## Data Migration Process

```javascript
// migrateToMongo.js
1. Connect to MongoDB
2. Clear existing collections
3. Read JSON files from backend/data/
4. Map JSON → MongoDB schemas
5. Insert with insertMany()
6. Report statistics
7. Disconnect

// Maps:
users.json → User collection (legacyId preserved)
products.json → Product collection
reviews.json → Review collection
```

---

## Backup & Restore

### Backup (MongoDB Atlas)
1. Go to MongoDB Atlas Dashboard
2. Select Cluster → Backup → Snapshots
3. Click "Restore" to recover

### Manual Backup
```bash
# Export to JSON
mongoexport --uri "mongodb+srv://..." --collection users > backup_users.json

# Import from JSON
mongoimport --uri "mongodb+srv://..." --collection users < backup_users.json
```

---

## Performance Considerations

### Query Optimization
- ✅ Indexed searches are fast
- ✅ Lean queries return plain objects (faster)
- ✅ Pagination prevents loading all documents

### Connection Pool
- Mongoose maintains connection pool
- Reuses connections across requests
- Handles connection failures gracefully

### Caching (Future)
```javascript
// Could add Redis for:
// - Product cache
// - Category lists
// - User profile cache
```

---

## Environment Variables Explained

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
           ↓
    MongoDB connection string
    
    Format: mongodb+srv://username:password@cluster.mongodb.net/database
    - username: Database user (NOT MongoDB account)
    - password: Database user password
    - cluster: Your cluster name
    - database: Database name (auto-created)
```

---

## Error Handling

### Connection Errors
```javascript
// Automatic fallback
if (mongoose.connection.readyState === 1) {
  // Connected - use MongoDB
} else {
  // Fallback to JSON files
  const data = read('collection');
}
```

### Validation Errors
```javascript
// Schema validates before saving
// If invalid → error response → user notified
```

### Duplicate Emails
```javascript
// MongoDB enforces unique emails
// If duplicate → CastError caught → 400 response
```

---

## Security Features

✅ **Password Security**
- bcryptjs hashing (10 rounds)
- Pre-save hook encrypts passwords
- Password field excluded from JSON responses

✅ **Data Validation**
- Mongoose schema validation
- Email uniqueness constraint
- Role-based access control

✅ **Index Security**
- Email indexed (prevents duplicate accounts)
- No exposed IDs in URLs (slugs used instead)

---

## Monitoring & Debugging

### Test MongoDB Connection
```bash
npm run test:mongo
# Shows: connection status, collections, document counts
```

### Check Server Logs
```
[orders] db query error: ...
[products] db query error: ...
[users] list error: ...
```

---

## Future Enhancements

1. **Aggregation Pipeline**
   - Sales reports
   - Product analytics
   - User behavior tracking

2. **Real-time Updates**
   - WebSocket + MongoDB change streams
   - Live product updates
   - Real-time order status

3. **Advanced Search**
   - Elasticsearch integration
   - Faceted search
   - Auto-suggest

4. **Analytics**
   - Order trends
   - Popular products
   - Customer insights

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/src/config/db.js` | MongoDB connection setup |
| `backend/models/User.js` | User schema definition |
| `backend/models/Product.js` | Product schema definition |
| `backend/models/Order.js` | Order schema definition |
| `backend/models/Review.js` | Review schema definition |
| `backend/controllers/usersController.js` | User operations |
| `backend/controllers/productsController.js` | Product operations |
| `backend/controllers/ordersController.js` | Order operations |
| `backend/scripts/migrateToMongo.js` | Data migration script |
| `backend/.env` | MongoDB URI configuration |

---

## Architecture Benefits

✅ **Scalability** - MongoDB handles large datasets
✅ **Flexibility** - Schema can evolve
✅ **Performance** - Indexed queries are fast
✅ **Reliability** - Automatic backups in Atlas
✅ **Availability** - Replicated across servers
✅ **Fallback** - Works with JSON if MongoDB down

---

**Your Classic Decor app is MongoDB-ready! 🚀**
