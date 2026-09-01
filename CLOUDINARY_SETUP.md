# Cloudinary Integration Guide

## Overview
Your Classic Decor project now supports **Cloudinary** for cloud image storage. All images will be stored on Cloudinary instead of locally.

## Setup Steps

### 1. Create Cloudinary Account
- Go to [cloudinary.com](https://cloudinary.com)
- Sign up for a free account
- Verify your email

### 2. Get Cloudinary Credentials
1. Log in to your Cloudinary Dashboard
2. Copy your **Cloud Name** from the dashboard
3. Click on "Account Settings" → "API Keys"
4. Copy your **API Key** and **API Secret**

### 3. Configure Environment Variables
1. Open `.env` file in your project root (or create one)
2. Add these three variables:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 4. Install Cloudinary Package (if not already installed)
```bash
npm install cloudinary
```

### 5. How It Works

**With Cloudinary Enabled:**
- When you upload an image via the admin dashboard
- It automatically uploads to your Cloudinary account
- The local copy is deleted
- You get a permanent cloud URL

**Fallback Behavior:**
- If Cloudinary credentials are missing → images stored locally
- If Cloudinary upload fails → automatically uses local storage
- No images will be lost

### 6. Upload Images from Admin Dashboard

1. Go to `/admin` (Admin Dashboard)
2. Navigate to **Products** tab
3. Click **New Product**
4. Upload an image
5. Image automatically goes to Cloudinary!

## Features

✅ **Automatic Upload** - No extra configuration needed
✅ **Fallback Support** - Works without Cloudinary too
✅ **Auto Deletion** - Local copies removed after cloud upload
✅ **Image Optimization** - Cloudinary automatically optimizes images
✅ **CDN Delivery** - Faster image loading worldwide

## Cloudinary Free Tier Benefits

- 25 GB storage
- 25 GB bandwidth/month
- Unlimited transformations
- 300,000 monthly transformations
- Full API access

## Troubleshooting

**Images still stored locally?**
- Check if `.env` file has Cloudinary credentials
- Verify credentials are correct
- Server restart may be needed: `npm start`

**Upload takes too long?**
- Cloudinary might be processing
- Check image file size (keep under 5MB)
- Poor internet connection?

**Keep local storage with Cloudinary?**
- Modify `backend/routes/upload.js`
- Remove `fs.unlink()` line to keep local copies

## Security Best Practices

⚠️ **Never commit `.env` to Git!**
- Add to `.gitignore`: `echo ".env" >> .gitignore`
- Use `.env.example` for team reference

⚠️ **API Secret should never be exposed**
- Don't use in frontend code
- Keep only on server side

⚠️ **Restrict API Key**
- Go to Cloudinary Account Settings
- Restrict key to only upload scope

## Advanced Features

### Organize Images by Folder
Images are automatically uploaded to `classic-decor/` folder on Cloudinary.

### Image Transformations
Cloudinary allows automatic image transformations:
- Resize
- Crop
- Convert formats
- Add watermarks
- And much more!

Example: `image_url?w=500&h=500&c=fill&q=auto`

## Support

For Cloudinary help:
- [Cloudinary Docs](https://cloudinary.com/documentation)
- [Upload API](https://cloudinary.com/documentation/image_upload_api_reference)

---

**Enjoy unlimited cloud storage for your Classic Decor images! 🎉**
