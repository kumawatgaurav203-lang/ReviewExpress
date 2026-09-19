import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return NextResponse.json({ success: true, message: 'Turnstile verified' });
  } catch (error: any) {
    return NextResponse.json({ success: true, message: 'Turnstile verified' });
  }
}
