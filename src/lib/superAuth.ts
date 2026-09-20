import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const SUPER_ADMIN_USERNAME = 'super';
export const SUPER_ADMIN_PASSWORD = 'Pass@1234';

export const SUPER_ADMIN_COOKIE_NAME = 'family_finance_super_token';

const SUPER_SECRET_STRING =
  process.env.SUPER_ADMIN_JWT_SECRET ||
  'super_admin_secret_key_family_finance_secure_32chars_required!';
const SUPER_SECRET = new TextEncoder().encode(SUPER_SECRET_STRING);

export interface SuperAdminSession {
  username: string;
  isSuperAdmin: boolean;
}

export function checkSuperAdminCredentials(u: string, p: string): boolean {
  return u.trim() === SUPER_ADMIN_USERNAME && p === SUPER_ADMIN_PASSWORD;
}

export async function signSuperAdminToken(): Promise<string> {
  return new SignJWT({ username: SUPER_ADMIN_USERNAME, isSuperAdmin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SUPER_SECRET);
}

export async function verifySuperAdminToken(token: string): Promise<SuperAdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, SUPER_SECRET);
    if (payload.isSuperAdmin && payload.username === SUPER_ADMIN_USERNAME) {
      return {
        username: payload.username as string,
        isSuperAdmin: true,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSuperAdminSession(): Promise<SuperAdminSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SUPER_ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySuperAdminToken(token);
}

export async function getSuperAdminSessionFromRequest(
  req: NextRequest
): Promise<SuperAdminSession | null> {
  // 1. Try NextRequest cookies
  let token = req.cookies.get(SUPER_ADMIN_COOKIE_NAME)?.value;

  // 2. Try next/headers cookies() store
  if (!token) {
    try {
      token = cookies().get(SUPER_ADMIN_COOKIE_NAME)?.value;
    } catch {}
  }

  // 3. Try raw Cookie header parsing
  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SUPER_ADMIN_COOKIE_NAME}=([^;]*)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return null;
  return verifySuperAdminToken(token);
}

export function setSuperAdminCookie(res: NextResponse, token: string): void {
  const isSecure = process.env.NODE_ENV === 'production';

  // Set via next/headers store if available
  try {
    cookies().set({
      name: SUPER_ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  } catch {}

  // Set on response headers
  res.cookies.set({
    name: SUPER_ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export function clearSuperAdminCookie(res: NextResponse): void {
  const isSecure = process.env.NODE_ENV === 'production';

  try {
    cookies().set({
      name: SUPER_ADMIN_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  } catch {}

  res.cookies.set({
    name: SUPER_ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
