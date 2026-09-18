# 🚀 Family Finance Tracker - Vercel & External MySQL Deployment Guide

This guide walks you through deploying your **Family Finance Tracker** to **Vercel** with a high-performance **External Cloud MySQL** database.

---

## 🏗️ Architecture Overview

- **Frontend & API**: Hosted on **Vercel** (Next.js 14 App Router, Serverless Functions, Edge Network, automatic HTTPS).
- **Database**: Cloud MySQL database (e.g., **TiDB Cloud Serverless**, **Aiven MySQL**, **Railway**, or **AWS RDS**).
- **ORM**: Prisma with serverless connection pooling & persistent instance caching.

---

## 📋 Step 1: Get an External MySQL Database (Free & Instant)

If you don't already have an external MySQL database, the recommended 100% free options are:

### Option A: TiDB Cloud Serverless (⭐ Highly Recommended)
1. Go to [tidbcloud.com](https://tidbcloud.com) and sign up (free, no credit card required).
2. Click **Create Cluster** → Select **Serverless** (Free 5 GB storage).
3. Once created, click **Connect** → Choose **Prisma** or **General**.
4. Copy your MySQL connection string. It will look like:
   ```env
   mysql://<USERNAME>:<PASSWORD>@<HOST>:4000/<DB_NAME>?sslaccept=strict
   ```

### Option B: Aiven MySQL
1. Go to [aiven.io](https://aiven.io) and create a free MySQL service.
2. In the service overview, copy the **Service URI** (`mysql://avnadmin:password@host:port/defaultdb?ssl-mode=REQUIRED`).

### Option C: Railway / AWS RDS / DigitalOcean
- Any MySQL 8.0+ instance with public internet access and SSL enabled works out of the box.

> [!TIP]
> **Password Special Characters**: If your database password contains characters like `@`, `#`, `$`, or `%`, ensure they are URL-encoded (e.g. `@` becomes `%40`, `#` becomes `%23`).

---

## 🔄 Step 2: Push Schema & Migrate Local Data to External DB

You have existing data locally (users Moiz & Saiyada, incomes, and expenses). We have built a 1-click sync script to transfer everything automatically:

Run the following in your terminal:
```bash
npm run db:sync-external
```

When prompted, paste your external MySQL connection string. The script will:
1. Automatically run `prisma db push` on the remote database to create all tables and indexes.
2. Read your local MySQL data.
3. Transfer all Households, Users (with hashed passwords preserved), Incomes, Expenses, and Recurring records seamlessly.

---

## 🌐 Step 3: Deploy to Vercel

### Method 1: Via GitHub & Vercel Dashboard (Easiest)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure Vercel and external MySQL production deployment"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Log in to [vercel.com](https://vercel.com).
   - Click **Add New...** → **Project**.
   - Select your GitHub repository and click **Import**.

3. **Configure Environment Variables in Vercel**:
   Under the **Environment Variables** section, add:
   - `DATABASE_URL`: `mysql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DB_NAME>?sslaccept=strict&connection_limit=5`
   - `JWT_SECRET`: `family_finance_super_secret_jwt_key_at_least_32_characters_long` *(or generate your own secure 32+ character string)*
   - `NEXT_PUBLIC_APP_URL`: `https://<YOUR-PROJECT-NAME>.vercel.app`

4. **Deploy**:
   - Click **Deploy**.
   - Vercel will automatically run `prisma generate && next build` and deploy your app in under 1 minute!

---

### Method 2: Via Terminal using Vercel CLI

If you prefer deploying directly from your computer:

1. **Login to Vercel**:
   ```bash
   npx vercel login
   ```
   *(Follow the prompt in your browser to authorize)*

2. **Deploy to Preview / Link Project**:
   ```bash
   npx vercel
   ```
   *(Accept the defaults: Next.js framework, root directory `./`)*

3. **Set Environment Variables**:
   ```bash
   npx vercel env add DATABASE_URL production
   npx vercel env add JWT_SECRET production
   npx vercel env add NEXT_PUBLIC_APP_URL production
   ```

4. **Deploy to Production**:
   ```bash
   npx vercel --prod
   ```

---

## ⚙️ Key Technical Enhancements Made for Vercel

1. **Build Lifecycle Hooks**: Added `"postinstall": "prisma generate"` and `"build": "prisma generate && next build"` in `package.json` to guarantee Prisma engine binaries are compiled during Vercel's build step.
2. **Serverless Connection Management**: Updated `src/lib/prisma.ts` to cache the Prisma client on `globalThis` in production, preventing serverless function cold/warm restarts from saturating database connections.
3. **Cross-Origin Security**: Added `*.vercel.app` to `allowedOrigins` in `next.config.mjs` for Server Actions security.
4. **Automated Migration Tool**: Created `scripts/sync-external-db.mjs` for 1-command migration of local database records to any external cloud MySQL database.
