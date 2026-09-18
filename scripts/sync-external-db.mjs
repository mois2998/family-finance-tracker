import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import readline from 'readline';

// Helper to ask question in terminal
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function run() {
  console.log('\n======================================================');
  console.log('  Family Finance Tracker - External DB Sync Tool');
  console.log('======================================================\n');

  // 1. Get Target External DB URL
  let targetUrl = process.env.EXTERNAL_DATABASE_URL || process.argv[2];
  if (!targetUrl) {
    targetUrl = await prompt('Enter your external MySQL connection URL: ');
  }

  if (!targetUrl) {
    console.error('❌ Error: No external database URL provided.');
    process.exit(1);
  }

  // Sanitize display URL (hide password)
  const sanitizedUrl = targetUrl.replace(/:([^@/]+)@/, ':****@');
  console.log(`\n🎯 Target External Database: ${sanitizedUrl}\n`);

  // 2. Push schema to external database
  console.log('📦 Step 1: Pushing database schema to external MySQL...');
  try {
    execSync('npx prisma db push --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: targetUrl },
      stdio: 'inherit',
    });
    console.log('✅ Schema pushed successfully to external database!\n');
  } catch (err) {
    console.error('❌ Failed to push schema to external database. Please verify connection credentials and network access.');
    process.exit(1);
  }

  // 3. Connect to local database and target database
  console.log('🔄 Step 2: Reading local records and transferring to external database...');
  const localPrisma = new PrismaClient();
  const externalPrisma = new PrismaClient({
    datasources: {
      db: {
        url: targetUrl,
      },
    },
  });

  try {
    // 3.1 Households
    const households = await localPrisma.household.findMany();
    console.log(`Found ${households.length} household(s) locally.`);
    for (const h of households) {
      await externalPrisma.household.upsert({
        where: { id: h.id },
        update: h,
        create: h,
      });
    }

    // 3.2 Users
    const users = await localPrisma.user.findMany();
    console.log(`Found ${users.length} user(s) locally.`);
    for (const u of users) {
      await externalPrisma.user.upsert({
        where: { id: u.id },
        update: u,
        create: u,
      });
    }

    // 3.3 RecurringExpenses
    const recurring = await localPrisma.recurringExpense.findMany();
    console.log(`Found ${recurring.length} recurring expense(s) locally.`);
    for (const r of recurring) {
      await externalPrisma.recurringExpense.upsert({
        where: { id: r.id },
        update: r,
        create: r,
      });
    }

    // 3.4 Incomes
    const incomes = await localPrisma.income.findMany();
    console.log(`Found ${incomes.length} income(s) locally.`);
    for (const i of incomes) {
      await externalPrisma.income.upsert({
        where: { id: i.id },
        update: i,
        create: i,
      });
    }

    // 3.5 Expenses
    const expenses = await localPrisma.expense.findMany();
    console.log(`Found ${expenses.length} expense(s) locally.`);
    for (const e of expenses) {
      await externalPrisma.expense.upsert({
        where: { id: e.id },
        update: e,
        create: e,
      });
    }

    // 3.6 CategoryBudgets
    const budgets = await localPrisma.categoryBudget.findMany();
    console.log(`Found ${budgets.length} category budget(s) locally.`);
    for (const b of budgets) {
      await externalPrisma.categoryBudget.upsert({
        where: { id: b.id },
        update: b,
        create: b,
      });
    }

    // 3.7 SavingsGoals
    const goals = await localPrisma.savingsGoal.findMany();
    console.log(`Found ${goals.length} savings goal(s) locally.`);
    for (const g of goals) {
      await externalPrisma.savingsGoal.upsert({
        where: { id: g.id },
        update: g,
        create: g,
      });
    }

    console.log('\n======================================================');
    console.log('🎉 SUCCESS! All local data migrated to external MySQL!');
    console.log(`   - Households: ${households.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Incomes: ${incomes.length}`);
    console.log(`   - Expenses: ${expenses.length}`);
    console.log(`   - Recurring: ${recurring.length}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Data sync error:', err);
  } finally {
    await localPrisma.$disconnect();
    await externalPrisma.$disconnect();
    process.exit(0);
  }
}

run();
