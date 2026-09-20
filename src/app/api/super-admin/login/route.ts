import { NextRequest, NextResponse } from 'next/server';
import {
  checkSuperAdminCredentials,
  signSuperAdminToken,
  setSuperAdminCookie,
  clearSuperAdminCookie,
} from '@/lib/superAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const isValid = checkSuperAdminCredentials(username, password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid super admin credentials' }, { status: 401 });
    }

    const token = await signSuperAdminToken();
    const response = NextResponse.json({ success: true, message: 'Super admin authenticated' });
    setSuperAdminCookie(response, token);

    return response;
  } catch (err: any) {
    console.error('Super admin login error:', err);
    return NextResponse.json({ error: 'Server error during login' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Super admin logged out' });
  clearSuperAdminCookie(response);
  return response;
}
