import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { getSuperAdminSessionFromRequest } from '@/lib/superAuth';
import { ensureFeedbackTable } from '@/lib/feedbackHelper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Ensure table exists in database (auto-heal for TiDB / external cloud DB)
    await ensureFeedbackTable();

    // 2. Identify submitter (family member or super admin testing)
    let session = await getSessionFromRequest(req);
    let householdId = session?.householdId;
    let userId = session?.userId;

    if (!householdId || !userId) {
      // Check if logged in as super admin
      const superSession = await getSuperAdminSessionFromRequest(req);
      if (superSession) {
        const anyUser = await prisma.user.findFirst();
        if (anyUser) {
          householdId = anyUser.householdId;
          userId = anyUser.id;
        }
      }
    }

    // Fallback: If session cookie was dropped by browser, associate with primary household
    if (!householdId || !userId) {
      const fallbackUser = await prisma.user.findFirst();
      if (fallbackUser) {
        householdId = fallbackUser.householdId;
        userId = fallbackUser.id;
      }
    }

    if (!householdId || !userId) {
      return NextResponse.json(
        { error: 'No active household found. Please sign in to submit feedback.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, title, message, screenshot, pageUrl, deviceInfo } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Please enter your message or issue description' },
        { status: 400 }
      );
    }

    const validTypes = ['BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'GENERAL'];
    const feedbackType = validTypes.includes(type) ? type : 'BUG';

    const feedback = await prisma.feedback.create({
      data: {
        householdId,
        userId,
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
    return NextResponse.json(
      { error: err?.message || 'Server error submitting feedback' },
      { status: 500 }
    );
  }
}
