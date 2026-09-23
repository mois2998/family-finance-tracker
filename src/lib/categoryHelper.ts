import prisma from '@/lib/prisma';

let tableChecked = false;

/**
 * Ensures the CustomCategory table exists in the connected database (TiDB Cloud, MySQL, etc.)
 * This provides zero-downtime auto-migration so custom categories work instantly.
 */
export async function ensureCustomCategoryTable(): Promise<void> {
  if (tableChecked) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`CustomCategory\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`householdId\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`type\` VARCHAR(191) NOT NULL DEFAULT 'EXPENSE',
        \`color\` VARCHAR(191) NULL DEFAULT '#6366f1',
        \`icon\` VARCHAR(191) NULL DEFAULT 'Tag',
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`CustomCategory_householdId_name_type_key\` (\`householdId\`, \`name\`, \`type\`),
        INDEX \`CustomCategory_householdId_idx\` (\`householdId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    tableChecked = true;
  } catch (err: any) {
    console.error('Failed to auto-create CustomCategory table:', err?.message || err);
  }
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Groceries & Food',
  'Mobile & Internet Recharge',
  'Housing & Rent',
  'Electricity & Utilities',
  'Healthcare & Medicine',
  'Transportation & Fuel',
  'Education & Fees',
  'Entertainment & Dining',
  'Shopping',
  'Personal Care',
  'Insurance',
  'EMI & Loans',
  'Other',
];

export const DEFAULT_INCOME_SOURCES = [
  'Salary / Job',
  'Freelance / Consulting',
  'Business / Trade',
  'Rental Income',
  'Investments & Dividends',
  'Gift / Allowance',
  'Other',
];
