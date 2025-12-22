# My Website Project

## References / Data Sources

- **Google Form (Form Link 1) Contact Us** : [Form Responses](https://docs.google.com/forms/d/1Uk4cSCMlddqpgBl5LRyoPwCH09EofTHr508pOYaHsV8/edit#responses)

- **Google Sheet (Responses) DataSave**: [Spreadsheet Link](https://docs.google.com/spreadsheets/d/1TJaYyEpqZQw41yx1ptpYXXX6hmvmaNuskgX7sObQ2SA/edit?gid=0#gid=0)


API SheetDB: https://sheetdb.io/api/v1/rxqrvvtgxbndk
             https://sheetdb.io/app/apis

## Backend / MongoDB Setup

This project can run with MongoDB (recommended for production). To enable MongoDB support:

1. Create a MongoDB database and get the connection URI (e.g., from MongoDB Atlas). Set it in the backend `.env` as `MONGODB_URI`.
2. From `backend` run:

```bash
npm install
npm run seed    # will import data/products.json into MongoDB
npm run dev     # run the dev server (nodemon)
```

If `MONGODB_URI` is not set, the backend will fall back to the existing file-based store under `backend/data/`.

> You can also set `FRONTEND_URL` env var so Stripe and other redirects point to your deployed frontend.

> Note: Make sure to set `STRIPE_SECRET_KEY` and other env variables when running payment flows.
