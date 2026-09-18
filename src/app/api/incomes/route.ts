import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'household';
    const memberId = searchParams.get('memberId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month'); // e.g. "2026-10"

    const where: any = {
      householdId: session.householdId,
    };

    const isAdmin = session.role === 'ADMIN';
    if (!isAdmin || view === 'personal') {
      where.userId = session.userId;
    } else if (isAdmin && memberId) {
      where.userId = memberId;
    }

    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      where.dateReceived = { gte: start, lte: end };
    } else if (startDate || endDate) {
      where.dateReceived = {};
      if (startDate) where.dateReceived.gte = new Date(startDate);
      if (endDate) where.dateReceived.lte = new Date(endDate);
    }

    const incomes = await prisma.income.findMany({
      where,
      orderBy: { dateReceived: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
          },
        },
      },
    });

    return NextResponse.json({ incomes });
  } catch (err: any) {
    console.error('Error fetching incomes:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { source, amount, frequency, dateReceived, notes, userId } = body;

    if (!source || !amount) {
      return NextResponse.json({ error: 'Source and amount are required' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Strict role-based target user resolution
    let targetUserId = session.userId;
    if (session.role === 'ADMIN' && userId && userId !== session.userId) {
      // Validate that the target user belongs to the same household
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, householdId: session.householdId },
      });
      if (targetUser) {
        targetUserId = targetUser.id;
      }
    }

    const income = await prisma.income.create({
      data: {
        householdId: session.householdId,
        userId: targetUserId,
        source: source.trim(),
        amount: numAmount,
        frequency: frequency || 'MONTHLY',
        dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
        notes: notes ? notes.trim() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, income });
  } catch (err: any) {
    console.error('Error creating income:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
