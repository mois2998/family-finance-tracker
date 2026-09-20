import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, title, message, screenshot, pageUrl, deviceInfo } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Please enter your message or issue description' }, { status: 400 });
    }

    const validTypes = ['BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'GENERAL'];
    const feedbackType = validTypes.includes(type) ? type : 'BUG';

    const feedback = await prisma.feedback.create({
      data: {
        householdId: session.householdId,
        userId: session.userId,
        type: feedbackType,
        title: title ? title.trim() : null,
        message: message.trim(),
        screenshot: screenshot || null,
        pageUrl: pageUrl || null,
        deviceInfo: deviceInfo || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        household: {
          select: { id: true, name: true, inviteCode: true },
        },
      },
    });

    return NextResponse.json({ success: true, feedback });
  } catch (err: any) {
    console.error('Error submitting feedback:', err);
    return NextResponse.json({ error: 'Server error submitting feedback' }, { status: 500 });
  }
}
