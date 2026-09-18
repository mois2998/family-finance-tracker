import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { source, amount, frequency, dateReceived, notes } = body;

    const existing = await prisma.income.findFirst({
      where: { id, householdId: session.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Income entry not found' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const updated = await prisma.income.update({
      where: { id },
      data: {
        ...(source ? { source: source.trim() } : {}),
        ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
        ...(frequency ? { frequency } : {}),
        ...(dateReceived ? { dateReceived: new Date(dateReceived) } : {}),
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
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

    return NextResponse.json({ success: true, income: updated });
  } catch (err: any) {
    console.error('Error updating income:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const existing = await prisma.income.findFirst({
      where: { id, householdId: session.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Income entry not found' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await prisma.income.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting income:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
