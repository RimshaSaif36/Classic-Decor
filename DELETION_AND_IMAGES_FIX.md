# Product Deletion & Image Path Fixes ✅

## Issues Fixed

### 1. **Product Deletion Not Working in MongoDB**
- **Problem**: DELETE endpoint only handled JSON file deletion, not MongoDB
- **Location**: `backend/routes/products.js` - DELETE route
- **Solution**: Added MongoDB support to delete endpoint
  - Checks if database is connected
  - Supports deletion by `_id`, numeric `id`, or `slug`
  - Falls back to JSON file deletion if MongoDB not connected
  - Returns proper 404 and error responses

### 2. **Product Updates Not Working in MongoDB**
- **Problem**: PUT endpoint only handled JSON file updates, not MongoDB
- **Location**: `backend/routes/products.js` - PUT route
- **Solution**: Added full MongoDB support
  - Updates document by multiple identifiers
  - Returns updated document
  - Proper error handling and fallback

### 3. **Image Path Inconsistency**
- **Problem**: Images uploaded to wrong directory, inconsistent path naming
- **Solutions Applied**:
  - ✅ Upload directory now uses `frontend/images/` (matches server config)
  - ✅ Image URL function normalizes all paths
  - ✅ Frontend .env.local points to localhost backend

## Files Modified

### `backend/routes/products.js` - Complete Rewrite
- ✅ DELETE route now supports both MongoDB and JSON
- ✅ PUT route now supports both MongoDB and JSON
- ✅ Better error handling and logging
- ✅ Proper query building for MongoDB operations

### `backend/routes/upload.js` - Fixed Path
- ✅ Changed from `../../images/` to `../../frontend/images/`
- ✅ Consistent with server static file serving

### `frontend/src/lib/utils.js` - Enhanced
- ✅ Improved `imgUrl()` function
- ✅ Better path normalization
- ✅ Handles all path formats

### `frontend/.env.local` - Created
- ✅ `VITE_API_URL=http://localhost:3001`
- ✅ Points frontend to local backend

## Testing Instructions

### Test 1: Delete Product from Admin Panel
1. Go to http://localhost:5173/admin
2. Scroll to "Products (24)" section
3. Click DELETE button on any product
4. Verify product is removed from list
5. Check backend logs for successful deletion

### Test 2: Edit Product
1. Click EDIT button on a product
2. Change name/price
3. Click Save
4. Verify changes appear in product list

### Test 3: Upload Product Image
1. Go to Admin > New Product
2. Fill in product details
3. Click "Choose file" and select an image
4. Image should display thumbnail
5. Create product
6. Image should appear in product list

### Test 4: Check Database
```bash
# If using MongoDB:
mongo
use classic-decore
db.products.find().count()  # Should show products

# If using JSON:
# Check: backend/data/products.json
```

## Image Path Flow

```
User uploads image
    ↓
/api/upload endpoint
    ↓
Saves to: frontend/images/[filename]
    ↓
Returns: /images/[filename]
    ↓
Stored in DB as: /images/[filename] or images/[filename]
    ↓
Frontend imgUrl() normalizes to: http://localhost:3001/images/[filename]
    ↓
Server serves from: frontend/images/[filename]
    ↓
Image displays in browser ✅
```

## Database vs JSON Fallback

The system now supports **both**:
1. **MongoDB (Production)**: Uses `MONGODB_URI` env variable
2. **JSON Files (Development)**: Fallback if MongoDB not connected

Both work seamlessly with the same API endpoints!

## Quick Debugging

### If delete doesn't work:
```bash
# Check server logs for errors
# Verify auth token is valid (check localStorage in browser DevTools)
# Check network tab - DELETE should return 204 No Content

# Test with curl:
curl -X DELETE http://localhost:3001/api/products/[id] \
  -H "Authorization: Bearer [token]"
```

### If images still don't show:
1. Open DevTools > Network tab
2. Find image request
3. Check URL is: `http://localhost:3001/images/...`
4. Status should be 200, not 404
5. Check file exists in `frontend/images/`

## Configuration Summary

**Backend Environment (.env)**:
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/classic-decore
```

**Frontend Environment (frontend/.env.local)**:
```
VITE_API_URL=http://localhost:3001
```

**File Locations**:
- Upload destination: `frontend/images/`
- Server serves from: `http://localhost:3001/images/`
- Images accessible at: `http://localhost:3001/images/filename.jpg`

---

✅ All fixes applied! Restart both servers and test.
