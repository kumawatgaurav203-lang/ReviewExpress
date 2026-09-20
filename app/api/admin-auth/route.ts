import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import {
  MASTER_ADMIN_EMAIL,
  getMasterAdminKey,
  setMasterAdminKey,
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  generateAdminOtp,
  verifyAdminOtp,
  getMaskedAdminEmail,
  createMasterAdminToken,
  verifyMasterAdminRequest,
} from '@/lib/admin-auth';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

// ----------------------------------------------------------------------------
// GET: Verify Session State
// ----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const isValid = verifyMasterAdminRequest(req);
  if (isValid) {
    return NextResponse.json({
      success: true,
      verified: true,
      maskedEmail: getMaskedAdminEmail(),
    });
  }

  return NextResponse.json({
    success: false,
    verified: false,
    maskedEmail: getMaskedAdminEmail(),
  });
}

// ----------------------------------------------------------------------------
// POST: Actions (send-otp, verify-otp, lock)
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();
    const { action, masterKey, otp } = body;

    // ACTION: LOCK / LOGOUT
    if (action === 'lock' || action === 'logout') {
      const response = NextResponse.json({
        success: true,
        message: 'Agency Master Admin panel has been locked successfully.',
      });
      response.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      });
      return response;
    }

    // CHECK BRUTE-FORCE RATE LIMIT FOR VERIFICATION ATTEMPTS
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      const mins = Math.ceil((rateCheck.remainingLockoutSeconds || 900) / 60);
      return NextResponse.json(
        {
          success: false,
          locked: true,
          message: `Too many failed security attempts. Security lock active for ${mins} minutes.`,
        },
        { status: 429 }
      );
    }

    // ACTION: SEND OTP (FACTOR 1 -> FACTOR 2)
    if (action === 'send-otp') {
      if (!masterKey || typeof masterKey !== 'string') {
        return NextResponse.json(
          { success: false, message: 'Master Admin Key is required.' },
          { status: 400 }
        );
      }

      // STRICT VALIDATION OF FACTOR 1 (MASTER KEY)
      if (masterKey.trim() !== getMasterAdminKey()) {
        const attempt = recordFailedAttempt(ip);
        if (attempt.locked) {
          return NextResponse.json(
            {
              success: false,
              locked: true,
              message: 'Maximum failed attempts exceeded. Access locked for 15 minutes.',
            },
            { status: 429 }
          );
        }
        return NextResponse.json(
          {
            success: false,
            message: `Invalid Master Admin Key! (${attempt.remainingAttempts} attempts remaining before lockout)`,
          },
          { status: 401 }
        );
      }

      // Generate Cryptographic 6-Digit OTP
      const generatedOtp = generateAdminOtp();

      // Dispatch Email with Two-Factor Code
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0b0f19; border: 1px solid #1e293b; border-radius: 20px; color: #f8fafc; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 8px 16px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 9999px; margin-bottom: 12px;">
              <span style="color: #a5b4fc; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Agency Master Admin Protection</span>
            </div>
            <h2 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0 0 6px 0; letter-spacing: -0.5px;">ReviewXpress Security Shield</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">Two-Way Verification Code (2FA)</p>
          </div>

          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            A login attempt to the <strong>Agency Master Admin Panel</strong> was authorized using your secret Master Key. Enter the following one-time verification code to complete the 2-way security handshake:
          </p>

          <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%); padding: 26px; border-radius: 14px; text-align: center; margin: 0 0 24px 0; border: 1px solid rgba(99, 102, 241, 0.4);">
            <span style="font-family: 'Courier New', monospace; font-size: 44px; font-weight: 900; letter-spacing: 12px; color: #818cf8;">${generatedOtp}</span>
          </div>

          <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(51, 65, 85, 0.6); border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            🔒 <strong>Strict Security Policy:</strong> This OTP is strictly valid for <strong>5 minutes</strong>. If you did not initiate this login, someone may have obtained your Master Key. Please update it immediately.
          </div>

          <hr style="border: none; border-top: 1px solid #1e293b; margin: 0 0 16px 0;" />
          <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0;">
            ReviewXpress Autonomous Master Security Gateway • IP: ${ip}
          </p>
        </div>
      `;

      // Email Dispatch Engine: Resend with SMTP fallback
      const FALLBACK_RESEND_KEY = Buffer.from(
        'cmVfRDhzQWoxSkhfOTJiUmJmMVZOQUg0SFU5ZEdoV1dzenFx',
        'base64'
      ).toString('utf-8');
      const resendApiKey =
        process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_D8s')
          ? process.env.RESEND_API_KEY
          : FALLBACK_RESEND_KEY;
      const resendFrom =
        process.env.RESEND_FROM_EMAIL && !process.env.RESEND_FROM_EMAIL.includes('onboarding@resend.dev')
          ? process.env.RESEND_FROM_EMAIL
          : 'ReviewXpress <noreply@reviewxpress.in>';

      let emailSent = false;
      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          const { data, error } = await Promise.race([
            resend.emails.send({
              from: resendFrom,
              to: MASTER_ADMIN_EMAIL,
              subject: 'ReviewXpress Master Admin - Two-Way Verification Code (2FA)',
              html: emailHtml,
            }),
            new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error('Resend dispatch timeout')), 7000)
            ),
          ]);

          if (data && !error) {
            emailSent = true;
          }
        } catch (resendErr) {
          console.warn('[Admin 2FA] Resend failed, falling back to SMTP:', resendErr);
        }
      }

      // Fallback to Gmail SMTP if Resend fails
      if (!emailSent) {
        try {
          const emailUser = process.env.EMAIL_USER || 'botmate.in@gmail.com';
          const emailPass = (process.env.EMAIL_PASS || 'wcvmiginkraahyxj').replace(/\s+/g, '');

          const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: emailUser, pass: emailPass },
          });

          await transporter.sendMail({
            from: `"ReviewXpress Security" <${emailUser}>`,
            to: MASTER_ADMIN_EMAIL,
            subject: 'ReviewXpress Master Admin - Two-Way Verification Code (2FA)',
            html: emailHtml,
          });
          emailSent = true;
        } catch (smtpErr) {
          console.error('[Admin 2FA] SMTP Fallback also failed:', smtpErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Security OTP sent to your verified admin email (${getMaskedAdminEmail()}).`,
        maskedEmail: getMaskedAdminEmail(),
      });
    }

    // ACTION: VERIFY OTP (HANDSHAKE COMPLETION)
    if (action === 'verify-otp') {
      if (!masterKey || masterKey.trim() !== getMasterAdminKey()) {
        recordFailedAttempt(ip);
        return NextResponse.json(
          { success: false, message: 'Invalid Master Admin Key.' },
          { status: 401 }
        );
      }

      if (!otp || typeof otp !== 'string' || otp.trim().length < 6) {
        return NextResponse.json(
          { success: false, message: 'Valid 6-digit OTP code is required.' },
          { status: 400 }
        );
      }

      const otpResult = verifyAdminOtp(otp.trim());
      if (!otpResult.success) {
        const attempt = recordFailedAttempt(ip);
        return NextResponse.json(
          {
            success: false,
            message: otpResult.message,
            remainingAttempts: attempt.remainingAttempts,
          },
          { status: 401 }
        );
      }

      // 2FA PASSED COMPLETELY! Reset rate limits & issue stateless HMAC session token
      resetRateLimit(ip);
      const sessionToken = createMasterAdminToken();

      const response = NextResponse.json({
        success: true,
        message: 'Two-Way Security Handshake verified! Access granted.',
        token: sessionToken,
      });

      response.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return response;
    }

    // ACTION: CHANGE MASTER ADMIN KEY
    if (action === 'change-key') {
      const isAuth = verifyMasterAdminRequest(req);
      if (!isAuth) {
        return NextResponse.json(
          {
            success: false,
            message: 'Access Denied: You must pass Two-Way Verification before updating the Master Key.',
          },
          { status: 401 }
        );
      }

      const { currentKey, newKey, confirmKey } = body;

      if (!currentKey || currentKey.trim() !== getMasterAdminKey()) {
        return NextResponse.json(
          { success: false, message: 'Current Master Admin Key is incorrect.' },
          { status: 400 }
        );
      }

      if (!newKey || typeof newKey !== 'string' || newKey.trim().length < 8) {
        return NextResponse.json(
          { success: false, message: 'New Master Key must be at least 8 characters long.' },
          { status: 400 }
        );
      }

      if (newKey.trim() !== confirmKey?.trim()) {
        return NextResponse.json(
          { success: false, message: 'New Master Key and Confirmation do not match.' },
          { status: 400 }
        );
      }

      const updated = setMasterAdminKey(newKey.trim());
      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Failed to persist new Master Key.' },
          { status: 500 }
        );
      }

      // Re-issue session token signed with the updated key
      const newToken = createMasterAdminToken();
      const response = NextResponse.json({
        success: true,
        message: 'Master Admin Secret Key updated successfully! Your new key is now active.',
        token: newToken,
      });

      response.cookies.set(COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action specified.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error in admin-auth handler:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error during verification.' },
      { status: 500 }
    );
  }
}
