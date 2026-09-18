import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const incs = await prisma.income.findMany({ include: { user: true } });
  console.log('--- ALL INCOMES IN DB ---');
  incs.forEach(i => console.log({ id: i.id, user: i.user.name, source: i.source, amount: i.amount, notes: i.notes, date: i.dateReceived.toISOString().split('T')[0] }));
  await prisma.$disconnect();
}
run();
