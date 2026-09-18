import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateInviteCode, hashPassword, setSessionCookie, signSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, mode, householdName, inviteCode } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    let householdId: string;
    let userRole: 'ADMIN' | 'MEMBER' = 'MEMBER';

    if (mode === 'join') {
      if (!inviteCode) {
        return NextResponse.json(
          { error: 'Invite code is required to join an existing household' },
          { status: 400 }
        );
      }

      const cleanCode = inviteCode.trim().toUpperCase();
      const household = await prisma.household.findUnique({
        where: { inviteCode: cleanCode },
      });

      if (!household) {
        return NextResponse.json(
          { error: 'Invalid invite code. Please check with your household admin.' },
          { status: 404 }
        );
      }

      householdId = household.id;
      userRole = 'MEMBER';
    } else {
      // Create a brand new household
      const finalHouseholdName = (householdName || `${name.trim()}'s Family`).trim();
      let uniqueInviteCode = generateInviteCode();

      // Ensure invite code uniqueness
      let codeExists = await prisma.household.findUnique({
        where: { inviteCode: uniqueInviteCode },
      });
      while (codeExists) {
        uniqueInviteCode = generateInviteCode();
        codeExists = await prisma.household.findUnique({
          where: { inviteCode: uniqueInviteCode },
        });
      }

      const newHousehold = await prisma.household.create({
        data: {
          name: finalHouseholdName,
          inviteCode: uniqueInviteCode,
          currency: '₹',
        },
      });

      householdId = newHousehold.id;
      userRole = 'ADMIN';
    }

    // Random avatar colors for visual distinction
    const avatarColors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0284c7', '#db2777'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    // Create user
    const newUser = await prisma.user.create({
      data: {
        householdId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: userRole,
        avatarColor: randomColor,
      },
    });

    // Create session token and response
    const token = await signSessionToken({
      userId: newUser.id,
      householdId: newUser.householdId,
      email: newUser.email,
      name: newUser.name,
      role: userRole,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        householdId: newUser.householdId,
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
