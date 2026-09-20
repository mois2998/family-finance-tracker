# Family Finance Tracker - Complete User & Administrator Guide

Welcome to the **Family Finance Tracker**, an enterprise-grade, multi-tenant financial tracking platform designed for families, couples, and shared households. This document provides an exhaustive, step-by-step walkthrough of all features, roles, and administrative controls.

---

## Table of Contents
1. [Platform Architecture & Multi-Tenancy](#1-platform-architecture--multi-tenancy)
2. [Account Setup & Household Collaboration](#2-account-setup--household-collaboration)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Expenses & Income Management](#4-expenses--income-management)
5. [Recurring Bills, EMIs & Skip Engine](#5-recurring-bills-emis--skip-engine)
6. [Budgets & Forecasting](#6-budgets--forecasting)
7. [In-App Feedback & Bug Reporting](#7-in-app-feedback--bug-reporting)
8. [Multi-Tenant Super Admin Panel](#8-multi-tenant-super-admin-panel)
9. [Troubleshooting & FAQs](#9-troubleshooting--faqs)

---

## 1. Platform Architecture & Multi-Tenancy

The platform is designed around strict tenant isolation:
- **Household Perimeter**: Every household has a unique database identifier (`householdId`), its own currency setting, invite code, budget definitions, and members.
- **Data Privacy**: Transactions, recurring bills, and ledger balances from one household are completely invisible to other households.
- **Cross-Platform Sync**: When one family member adds an expense on their device, all other members see updated balances and burn-rate charts in real time.

---

## 2. Account Setup & Household Collaboration

### Creating an Account
1. Navigate to `/register`.
2. Enter your Name, Email, and Secure Password.
3. Once registered, you have two choices:
   - **Create New Household**: Enter your family or apartment name (e.g., *"The Miller Family"*) and select your primary currency (USD, EUR, INR, GBP, etc.).
   - **Join Existing Household**: Enter the 6-character alphanumeric **Invite Code** shared with you by a family administrator.

### Inviting Family Members
1. Go to the **Household** tab in the sidebar.
2. Locate the **Invite Code** box (e.g. `#A8F9K2`).
3. Click **Copy Invite Link** or share the code directly with your spouse or family members.
4. When they register and enter that code, they will automatically join your household.

---

## 3. User Roles & Permissions

Each member within a household is assigned one of two roles:

| Action / Capability | Household ADMIN | Household MEMBER |
| :--- | :---: | :---: |
| **Log Daily Expenses & Incomes** | ✅ Yes | ✅ Yes |
| **View Household Dashboard & Charts** | ✅ Yes | ✅ Yes |
| **Edit/Delete Own Transactions** | ✅ Yes | ✅ Yes |
| **Edit/Delete Other Members' Transactions** | ✅ Yes | ❌ No |
| **Configure Recurring Bills / EMIs** | ✅ Yes | ✅ Yes |
| **Manage Monthly Budgets** | ✅ Yes | ❌ No |
| **Update Household Name & Currency** | ✅ Yes | ❌ No |
| **Generate New Invite Code** | ✅ Yes | ❌ No |
| **Remove Members from Household** | ✅ Yes | ❌ No |
| **Submit Feedback & Bug Reports** | ✅ Yes | ✅ Yes |

---

## 4. Expenses & Income Management

### Logging an Expense
1. Go to **Expenses** and click **+ Add Expense**.
2. Specify the **Amount**, **Category** (e.g. *Groceries, Utilities, Healthcare, Dining, Transport*), and **Date**.
3. Choose **Who Paid** (defaults to yourself).
4. Add optional notes or merchant details.
5. Click **Save**. The dashboard, category breakdown, and monthly budget progress bars update immediately.

### Income Tracking
- Navigate to **Incomes** to log monthly paychecks, bonuses, freelance revenue, or investments.
- The platform subtracts total expenses from total income to calculate your **Net Savings** and savings rate percentage.

### Filters & CSV Export
- Use the Month/Year dropdown to view historical ledgers.
- Filter by category, payer, or search keywords.
- Click **Export CSV** to download a spreadsheet copy for tax preparation or offline records.

---

## 5. Recurring Bills, EMIs & Skip Engine

The system features an intelligent recurrence engine built for loans, subscriptions, and utility bills:

### 1. Start-Date Based Calculation
- Each recurring bill has a specific **Start Date** (e.g., `2026-03-15`).
- The engine calculates past, present, and future occurrences starting strictly from that date. Months prior to the loan inception will never show phantom occurrences.
- Optional **End Date** stops recurrence after the loan is paid off.

### 2. Skipping Specific Occurrences (e.g. Loan Moratorium or Paused Subscription)
- If you paused a subscription for a month, or had an EMI moratorium in September:
  1. Open the **Recurring** tab.
  2. Click **Skip Month / Date** next to the bill.
  3. Select the target month (e.g., `2026-09`).
  4. The engine marks that single occurrence as skipped. It is excluded from that month's ledger and budget without deleting the overall subscription!
  5. You can restore or unskip it at any time.

### 3. Clean Cascading Deletion
- When you delete a recurring bill, the system automatically removes all associated generated occurrences and transaction links across your ledger, preventing orphaned entries.

---

## 6. Budgets & Forecasting

### Setting Category Budgets
- Set monthly spend caps for each category (e.g. $500 for Dining).
- Visual status indicators:
  - **Green (0% – 79%)**: Healthy spending.
  - **Yellow / Amber (80% – 99%)**: Warning threshold.
  - **Red (100%+)**: Budget exceeded.

### Cash Flow Forecasting
- The algorithm calculates your daily non-recurring velocity and projects end-of-month spend:
  $$\text{Projected Spend} = \text{Current Spent} + (\text{Daily Velocity} \times \text{Remaining Days}) + \text{Scheduled Recurring Bills}$$

---

## 7. In-App Feedback & Bug Reporting

Users can report issues or suggest features directly from inside the app:
1. Click **Feedback & Issues** in the sidebar footer (or **Feedback** in the top navigation).
2. Choose a category:
   - 🐞 **Bug Report**: Glitches, unexpected errors, or layout issues.
   - 💡 **Feature Request**: Suggestions for new capabilities.
   - ✨ **Improvement**: Tweaks to existing workflows.
   - 💬 **General Feedback**: Thoughts or praise.
3. Fill in the **Title** and **Detailed Message**.
4. **Attach Screenshots**:
   - Click the upload box to choose an image file, OR
   - Simply press <kbd>Ctrl + V</kbd> to paste a screenshot directly from your clipboard!
5. The form automatically logs the current page URL and device viewport to help developers quickly pinpoint the issue.
6. Click **Submit Feedback**.

---

## 8. Multi-Tenant Super Admin Panel

The **Super Admin Panel** is an isolated administrative suite for the platform owner to inspect and triage feedback across all households/tenants.

### Accessing the Super Admin Panel
- **URL**: `/super-admin` (or `/super-admin/login`)
- **Credentials**:
  - **Username**: `super`
  - **Password**: `Pass@1234`
- **Security**: The Super Admin session is stored in a dedicated HTTP-only cookie (`family_finance_super_token`) separate from tenant cookies.

### Super Admin Features
1. **Aggregated Cross-Tenant View**: Displays reports from all registered households along with Household Name, Invite Code, and Submitter details.
2. **KPI Overview**: Real-time counts of Total Reports, Pending, In Review, and Resolved.
3. **Filtering & Search**:
   - Filter by specific Household tenant.
   - Filter by status (`PENDING`, `IN_REVIEW`, `RESOLVED`, `DISMISSED`).
   - Filter by category (`BUG`, `FEATURE_REQUEST`, etc.).
   - Full-text search across titles, descriptions, and user emails.
4. **Interactive Status Triage**: Update an item's status inline with instant persistence.
5. **Private Admin Notes**: Record debugging notes, issue resolutions, or internal tracking IDs.
6. **Screenshot Lightbox**: Click any thumbnail to view high-resolution screenshots in a full modal viewer.
7. **Permanent Deletion**: Clean up resolved or obsolete reports.

---

## 9. Troubleshooting & FAQs

### Q: Why isn't my spouse seeing the recurring bill I created?
A: Ensure your spouse has refreshed their browser and is logged into the same household (check the invite code in the Household tab).

### Q: Can I run this database on TiDB Cloud or another MySQL provider?
A: Yes. The project includes `npm run db:sync-external`, which automatically connects to external MySQL/TiDB instances, pushes the Prisma schema, and migrates data.

### Q: How do I change the Super Admin password?
A: The super admin credentials can be configured via environment variables:
```env
SUPER_ADMIN_USERNAME="super"
SUPER_ADMIN_PASSWORD="Pass@1234"
SUPER_ADMIN_JWT_SECRET="your-secure-secret-key"
```

---

*Family Finance Tracker - Built with Next.js, Prisma, Tailwind CSS & Lucide Icons.*
