import { NextRequest, NextResponse } from 'next/server';
import { getOwnerAccountByEmail, updateOwnerPassword } from '@/lib/accounts-store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { otpStore } from '@/lib/otp-store';
import { checkRateLimit, RATE_LIMITS, checkRequestSize, validateField, hasSQLInjection } from '@/lib/api-guard';

export async function POST(req: NextRequest) {
  try {
    // ── Request size guard ──────────────────────────────────────────
    const sizeError = checkRequestSize(req, 4 * 1024); // 4 KB max
    if (sizeError) return sizeError;

    // ── Rate Limiting: 5 forgot-password requests per 15 min per IP ─
    const rateCheck = checkRateLimit(req, 'forgot-password', RATE_LIMITS.FORGOT_PASSWORD);
    if (!rateCheck.allowed) return rateCheck.response;

    const body = await req.json();
    const { action, email, otp, newPassword } = body;

    // ── Input Validation + SQL Injection Guard ──────────────────────
    const emailError = validateField(email, 'Email', { isEmail: true, maxLength: 254 });
    if (emailError) return emailError;

    const cleanEmail = (email as string).toLowerCase().trim();

    // Check account existence across Supabase & local storage
    let accountExists = false;
    const localAccount = getOwnerAccountByEmail(cleanEmail);
    if (localAccount) {
      accountExists = true;
    } else if (isSupabaseConfigured()) {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', cleanEmail)
          .single();
        if (dbUser) {
          accountExists = true;
        }
      } catch (err) {
        console.warn('[Forgot Password] Supabase query check error:', err);
      }
    }

    if (!accountExists) {
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

      // 1. Update in Supabase
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('users')
            .update({ password_hash: newPassword })
            .eq('email', cleanEmail);
        } catch (err) {
          console.error('[Forgot Password] Failed to update password in Supabase:', err);
        }
      }

      // 2. Update in local store
      updateOwnerPassword(cleanEmail, newPassword);

      otpStore.delete(cleanEmail);
      return NextResponse.json({ success: true, message: 'Password reset successfully. You can now login.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
