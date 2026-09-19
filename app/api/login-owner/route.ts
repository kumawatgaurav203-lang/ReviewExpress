import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerLogin } from '@/lib/accounts-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || password.length !== 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be exactly 8 characters / digits.' },
        { status: 400 }
      );
    }

    const authResult = verifyOwnerLogin(email, password);

    if (!authResult.success || !authResult.account) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Invalid credentials.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: authResult.account.id,
        email: authResult.account.email,
        businessName: authResult.account.businessName,
        businessSlug: authResult.account.businessSlug,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
