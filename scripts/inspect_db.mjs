import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const moiz = await prisma.user.findFirst({ where: { name: 'moiz' } });
    const saiyada = await prisma.user.findFirst({ where: { name: 'Saiyada' } });

    console.log('--- USERS ---');
    console.log('Moiz:', moiz?.id);
    console.log('Saiyada:', saiyada?.id);

    const expenses = await prisma.expense.findMany({
      include: { user: true },
      orderBy: { date: 'desc' }
    });

    console.log('\n--- ALL CURRENT EXPENSES ---');
    let moizTotal = 0;
    let householdTotal = 0;
    for (const e of expenses) {
      householdTotal += e.amount;
      if (e.userId === moiz?.id) moizTotal += e.amount;
      console.log(`[${e.user?.name}] ${e.description}: ₹${e.amount} (${e.category}) - Date: ${e.date.toISOString().split('T')[0]}`);
    }
    console.log('Moiz Expenses Total:', moizTotal);
    console.log('Household Expenses Total:', householdTotal);

    const incomes = await prisma.income.findMany({
      include: { user: true },
      orderBy: { dateReceived: 'desc' }
    });

    console.log('\n--- ALL CURRENT INCOMES ---');
    let moizInc = 0;
    let householdInc = 0;
    for (const i of incomes) {
      householdInc += i.amount;
      if (i.userId === moiz?.id) moizInc += i.amount;
      console.log(`[${i.user?.name}] ${i.source}: ₹${i.amount} (${i.frequency}) - Date: ${i.dateReceived.toISOString().split('T')[0]}`);
    }
    console.log('Moiz Incomes Total:', moizInc);
    console.log('Household Incomes Total:', householdInc);

    const recurring = await prisma.recurringExpense.findMany({
      include: { user: true }
    });
    console.log('\n--- ALL RECURRING ---');
    recurring.forEach(r => console.log(`[${r.user?.name}] ${r.name}: ₹${r.amount} (${r.frequency}) NextDue: ${r.nextDueDate ? r.nextDueDate.toISOString().split('T')[0] : 'none'}`));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
