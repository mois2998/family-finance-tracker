import prisma from '@/lib/prisma';

let tableChecked = false;

/**
 * Ensures the Feedback table exists in the connected database (TiDB Cloud, MySQL, etc.)
 * This handles zero-downtime auto-migration so users never encounter "Table doesn't exist" errors.
 */
export async function ensureFeedbackTable(): Promise<void> {
  if (tableChecked) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Feedback\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`householdId\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`type\` VARCHAR(191) NOT NULL DEFAULT 'BUG',
        \`title\` VARCHAR(191) NULL,
        \`message\` TEXT NOT NULL,
        \`screenshot\` LONGTEXT NULL,
        \`pageUrl\` VARCHAR(191) NULL,
        \`deviceInfo\` VARCHAR(191) NULL,
        \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
        \`adminNotes\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`Feedback_householdId_idx\` (\`householdId\`),
        INDEX \`Feedback_userId_idx\` (\`userId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    tableChecked = true;
  } catch (err: any) {
    console.error('Failed to auto-create Feedback table:', err?.message || err);
  }
}
