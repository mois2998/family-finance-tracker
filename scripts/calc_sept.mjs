import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { createdAt: 'desc' } });
    console.log(expenses.map(e => ({
      desc: e.description,
      amt: e.amount,
      date: e.date.toISOString().split('T')[0],
      createdAt: e.createdAt.toISOString()
    })));
  } finally {
    await prisma.$disconnect();
  }
}
run();
