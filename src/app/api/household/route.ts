import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateInviteCode, getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const household = await prisma.household.findUnique({
      where: { id: session.householdId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarColor: true,
            createdAt: true,
          },
        },
        categoryBudgets: true,
        savingsGoals: true,
      },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    return NextResponse.json({ household });
  } catch (err: any) {
    console.error('Error fetching household:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, name, currency, memberId, newRole } = body;

    // Update household settings
    if (action === 'update_settings') {
      if (session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only household admins can update settings' }, { status: 403 });
      }

      const updated = await prisma.household.update({
        where: { id: session.householdId },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(currency ? { currency: currency.trim() } : {}),
        },
      });

      return NextResponse.json({ success: true, household: updated });
    }

    // Regenerate invite code
    if (action === 'regenerate_invite') {
      if (session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only household admins can regenerate invite codes' }, { status: 403 });
      }

      let newCode = generateInviteCode();
      let exists = await prisma.household.findUnique({ where: { inviteCode: newCode } });
      while (exists) {
        newCode = generateInviteCode();
        exists = await prisma.household.findUnique({ where: { inviteCode: newCode } });
      }

      const updated = await prisma.household.update({
        where: { id: session.householdId },
        data: { inviteCode: newCode },
      });

      return NextResponse.json({ success: true, inviteCode: updated.inviteCode });
    }

    // Update member role
    if (action === 'update_member_role') {
      if (session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only household admins can modify member roles' }, { status: 403 });
      }

      if (!memberId || !['ADMIN', 'MEMBER'].includes(newRole)) {
        return NextResponse.json({ error: 'Invalid member ID or role' }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id: memberId },
        data: { role: newRole },
      });

      return NextResponse.json({ success: true, user: updatedUser });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error updating household:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
