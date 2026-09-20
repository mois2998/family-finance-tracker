import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSessionFromRequest } from '@/lib/superAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSuperAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Super admin only.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const householdId = searchParams.get('householdId');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (type && type !== 'ALL') where.type = type;
    if (householdId && householdId !== 'ALL') where.householdId = householdId;

    const [feedbacks, total, pending, inReview, resolved] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, avatarColor: true },
          },
          household: {
            select: { id: true, name: true, inviteCode: true, currency: true },
          },
        },
      }),
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'PENDING' } }),
      prisma.feedback.count({ where: { status: 'IN_REVIEW' } }),
      prisma.feedback.count({ where: { status: 'RESOLVED' } }),
    ]);

    // Unique households list for filtering
    const households = await prisma.household.findMany({
      select: { id: true, name: true, inviteCode: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      feedbacks,
      stats: { total, pending, inReview, resolved },
      households,
    });
  } catch (err: any) {
    console.error('Error fetching multi-tenant feedback:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSuperAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Super admin only.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID required' }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const updated = await prisma.feedback.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        household: { select: { id: true, name: true, inviteCode: true } },
      },
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (err: any) {
    console.error('Error updating feedback:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSuperAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Super admin only.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID required' }, { status: 400 });
    }

    await prisma.feedback.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting feedback:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
