# 👨‍👩‍👧‍👦 Family Finance Tracker

A full-stack, responsive personal & family finance tracking web application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM with MySQL**. 

Designed specifically for multi-user households: each family member has their own secure login, individual tracking, combined household views, cold-start cash flow predictions (including Indian 28-day mobile recharge cycles), and seamless exposure via **ngrok** reverse proxy tunnels.

---

## 🚀 Key Features

- **Multi-User Household Multi-Tenancy**: 
  - Create a new family household or join an existing one using an 8-character invite code (e.g. `FAM-8K92`).
  - Roles for **Admin / Parent** (manages settings, invite codes, member roles) and **Member**.
- **Household vs. Personal View Toggle**:
  - One-click top navigation toggle between **👨‍👩‍👧‍👦 Combined Household View** (total family finances) and **👤 My Personal View** (only entries logged by the signed-in member).
- **Intelligent Cold-Start Cash Flow Forecasting**:
  - **Zero / Sparse Data Ready**: Does not rely on fake seed data. In Month 1, calculates exact commitment-based projections using declared monthly income and active recurring commitments.
  - **Custom Intervals (28-Day Recharges)**: Built-in support for Indian prepaid recharge cycles (28 days) and recurring bills, automatically predicting upcoming due dates.
  - **Emerging Pattern AI**: Automatically scans historical expenses over time and suggests recurring patterns (e.g. insurance every 6 months, broadband every 30 days) with 1-click confirmation.
- **Deficit & Burn Rate Warning Banners**:
  - Visible alerts trigger whenever projected end-of-month savings are close to zero or negative.
  - Displays exact cash deficit, daily burn rate (₹/day), and estimated days remaining in the billing period.
- **Mobile-First Responsive UX & PWA**:
  - Desktop: Multi-column layout with left navigation sidebar and quick actions.
  - Mobile: Clean bottom navigation bar with floating action button (+) for rapid expense logging on the go.
  - Installable as a Progressive Web App (PWA) directly to iOS / Android home screens via ngrok.
- **Reverse Proxy & ngrok Ready**:
  - Zero hardcoded `localhost` URLs. Uses dynamic browser origins, relative API endpoints, and binds to `0.0.0.0` so tunnels work out of the box.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14.2 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Glassmorphism design system
- **Database & ORM**: MySQL via Prisma ORM 5.22
- **Auth**: Password hashing with `bcryptjs`, tamper-proof HTTP-only cookie sessions signed with `jose` (JWT)
- **Visualizations**: Recharts (Area charts for cash flow trajectories, Donut charts for category breakdown)
- **Icons**: Lucide React
- **Date Math**: date-fns

---

## 📦 Getting Started

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+
- **MySQL**: MySQL Server 8.x (Local MySQL service, XAMPP, or Docker)
- **ngrok** (optional, for exposing to family members outside your Wi-Fi)

---

### 2. Setting Up MySQL Database

1. Open your MySQL client (MySQL CLI, MySQL Workbench, phpMyAdmin, or DBeaver):
   ```sql
   CREATE DATABASE family_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Configure your `.env` file:
   Copy `.env.example` to `.env` (or edit `.env`):
   ```env
   # MySQL Connection String:
   # Format: mysql://USER:PASSWORD@HOST:PORT/DBNAME
   DATABASE_URL="mysql://root:your_mysql_password@localhost:3306/family_finance"

   # Secret key for JWT session cookies
   JWT_SECRET="family_finance_super_secret_jwt_key_at_least_32_characters_long"

   # Port configuration
   PORT=3000

   # Public URL (optional - leave default or set to your ngrok URL)
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. Run Prisma migration to create all tables:
   ```bash
   npx prisma migrate dev --name init
   ```
   *Alternatively, to push schema directly without migration history:*
   ```bash
   npx prisma db push
   ```

4. Generate the Prisma TypeScript Client:
   ```bash
   npx prisma generate
   ```

---

### 3. Running the App Locally

Start the development server:
```bash
npm run dev
```

The app will start and bind to `0.0.0.0:3000`:
- **Local Access**: Open [http://localhost:3000](http://localhost:3000) in your browser.
- **LAN Access**: Family members on the same Wi-Fi can access [http://YOUR_LOCAL_IP:3000](http://YOUR_LOCAL_IP:3000).

To build and run in production mode:
```bash
npm run build
npm run start
```

---

### 4. Exposing via ngrok (Tunnel to the Internet)

To let family members access the app from their phones outside your home network:

1. In a separate terminal, start an ngrok tunnel on port 3000:
   ```bash
   ngrok http 3000
   ```

2. ngrok will output a public HTTPS URL, for example:
   ```text
   Forwarding   https://a1b2-c3d4.ngrok-free.app -> http://localhost:3000
   ```

3. Share the HTTPS URL with your family members:
   - They can open the URL in Chrome or Safari on their mobile devices.
   - All session cookies are configured with `SameSite=Lax` and relative paths, working seamlessly through the tunnel.

---

### 5. Family Member Invite Flow

1. **First User Registration**:
   - The first family member goes to `/register`, selects **New Household**, and registers as the **Admin / Parent**.
   - A unique family invite code is generated automatically (e.g. `FAM-8K92`).

2. **Inviting Family Members**:
   - Navigate to the **Household** page (`/household`).
   - Click **Copy Invite Link** (copies `https://YOUR_TUNNEL/register?invite=FAM-8K92`).
   - Send this link via WhatsApp, SMS, or Telegram to family members.

3. **Joining**:
   - Clicking the link opens the registration page with the invite code pre-filled.
   - The new family member simply enters their name, email, and password to join your household immediately.

---

### 6. Cold-Start Strategy Guide

- **Day One**: You do not need historical data. On the dashboard or in the **Bills** tab, tap **Quick-Add Known Recurring Commitments** or use **Add Transaction** with the "Recurring" checkbox enabled:
  - Example: *Mobile Recharge, ₹599, every 28 days*.
  - Example: *House Rent, ₹15,000, monthly*.
- **Cash Flow Projections**:
  - The app calculates next due dates automatically based on interval days and displays upcoming bills for the next 45 days.
  - When you pay a bill, click **Mark Paid** on the upcoming item to record the actual expense and automatically advance the next due date by 28 days.
- **Trend Activation**:
  - Once 2–3 occurrences or multiple months accumulate, the forecasting engine automatically activates trend extrapolations, burn rate pace, and recurring pattern detection.

---

### 7. Installing as PWA on Mobile Home Screens

- **iOS (Safari)**: Open the ngrok URL, tap the **Share** button in Safari, and select **Add to Home Screen**.
- **Android (Chrome)**: Open the ngrok URL, tap the **three dots menu**, and select **Install App** or **Add to Home screen**.

---

## 🛡️ Database Schema Overview

- **`Household`**: Multi-tenant family entity (`id`, `name`, `inviteCode`, `currency`).
- **`User`**: Family members (`id`, `householdId`, `name`, `email`, `passwordHash`, `role`, `avatarColor`).
- **`Income`**: Member income entries (`id`, `householdId`, `userId`, `source`, `amount`, `frequency`, `dateReceived`).
- **`Expense`**: Daily expenses (`id`, `householdId`, `userId`, `category`, `amount`, `date`, `description`, `isRecurring`).
- **`RecurringExpense`**: Fixed commitments (`id`, `householdId`, `userId`, `name`, `category`, `amount`, `frequency`, `durationInDays`, `nextDueDate`, `confidence`, `isActive`).
- **`CategoryBudget`**: Monthly spend caps per category.
- **`SavingsGoal`**: Shared household target milestones.
