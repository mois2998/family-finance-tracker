import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionUser {
  userId: string;
  householdId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
}

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'family_finance_default_secret_key_change_in_production_32chars!';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const SESSION_COOKIE_NAME = 'family_finance_token';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // Valid for 30 days
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      householdId: payload.householdId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: (payload.role as 'ADMIN' | 'MEMBER') || 'MEMBER',
    };
  } catch {
    return null;
  }
}

/**
 * Get current session user from incoming request or server component cookie
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Get session user from NextRequest (for API routes or middleware)
 */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  // 1. Try NextRequest cookies
  let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // 2. Try next/headers cookies() store
  if (!token) {
    try {
      token = cookies().get(SESSION_COOKIE_NAME)?.value;
    } catch {}
  }

  // 3. Try raw Cookie header parsing
  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Set session cookie in NextResponse
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  const isSecure = process.env.NODE_ENV === 'production';

  try {
    cookies().set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: 'lax',
      secure: isSecure,
    });
  } catch {}

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    sameSite: 'lax',
    secure: isSecure,
  });
}

/**
 * Remove session cookie
 */
export function clearSessionCookie(response: NextResponse): void {
  const isSecure = process.env.NODE_ENV === 'production';

  try {
    cookies().set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax',
      secure: isSecure,
    });
  } catch {}

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
    secure: isSecure,
  });
}

/**
 * Generates an easy-to-read, memorable family invite code like 'FAM-7A9K'
 */
export function generateInviteCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `FAM-${randomPart}`;
}
