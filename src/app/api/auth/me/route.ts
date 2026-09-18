import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarColor: true,
        householdId: true,
        household: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
            currency: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarColor: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor,
        householdId: user.householdId,
        householdName: user.household.name,
        inviteCode: user.household.inviteCode,
        currency: user.household.currency,
        members: user.household.users,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/auth/me:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
