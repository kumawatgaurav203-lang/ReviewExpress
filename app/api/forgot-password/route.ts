import { NextRequest, NextResponse } from 'next/server';
import { getOwnerAccountByEmail, updateOwnerPassword } from '@/lib/accounts-store';
import { otpStore } from '@/lib/otp-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, otp, newPassword } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Valid email is required.' }, { status: 400 });
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    const account = getOwnerAccountByEmail(cleanEmail);
    if (!account) {
      return NextResponse.json({ success: false, message: 'No account found with this email.' }, { status: 404 });
    }

    if (action === 'send_otp') {
       return NextResponse.json({ success: true, message: 'Email found.' });
    }

    if (action === 'verify_otp') {
      if (!otp) {
        return NextResponse.json({ success: false, message: 'OTP is required.' }, { status: 400 });
      }

      const storedOtpData = otpStore.get(cleanEmail);
      if (!storedOtpData) {
        return NextResponse.json({ success: false, message: 'OTP not found. Please request a new one.' }, { status: 400 });
      }

      if (Date.now() > storedOtpData.expiresAt) {
        otpStore.delete(cleanEmail);
        return NextResponse.json({ success: false, message: 'OTP has expired. Please request a new one.' }, { status: 400 });
      }

      if (storedOtpData.otp !== String(otp).trim()) {
        return NextResponse.json({ success: false, message: 'Invalid OTP. Please enter the 6-digit code received in your email.' }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'OTP verified successfully.' });
    }

    if (action === 'verify_and_reset') {
      if (!otp) {
        return NextResponse.json({ success: false, message: 'OTP is required.' }, { status: 400 });
      }

      const storedOtpData = otpStore.get(cleanEmail);
      if (!storedOtpData) {
        return NextResponse.json({ success: false, message: 'OTP not found. Please request a new one.' }, { status: 400 });
      }

      if (Date.now() > storedOtpData.expiresAt) {
        otpStore.delete(cleanEmail);
        return NextResponse.json({ success: false, message: 'OTP has expired.' }, { status: 400 });
      }

      if (storedOtpData.otp !== String(otp).trim()) {
        return NextResponse.json({ success: false, message: 'Invalid OTP. Please enter the 6-digit code received in your email.' }, { status: 400 });
      }

      // Password validation: strictly 8 characters and at least 1 special symbol
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword || '');
      if (!newPassword || newPassword.length !== 8 || !hasSymbol) {
        return NextResponse.json({ 
          success: false, 
          message: 'Password must be strictly 8 characters long containing at least 1 special symbol (@, #, $, %, !, *).' 
        }, { status: 400 });
      }

      const updated = updateOwnerPassword(cleanEmail, newPassword);
      if (updated) {
        otpStore.delete(cleanEmail);
        return NextResponse.json({ success: true, message: 'Password reset successfully. You can now login.' });
      } else {
        return NextResponse.json({ success: false, message: 'Failed to update password.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
