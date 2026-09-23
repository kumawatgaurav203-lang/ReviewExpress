import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { otpStore } from '@/lib/otp-store';
import { checkRateLimit, RATE_LIMITS, checkRequestSize, validateField } from '@/lib/api-guard';

export async function POST(req: NextRequest) {
  try {
    // ── Request size guard ─────────────────────────────────────────
    const sizeError = checkRequestSize(req, 4 * 1024); // 4 KB max
    if (sizeError) return sizeError;

    // ── Rate Limiting: 5 OTP requests per 10 minutes per IP ────────
    const rateCheck = checkRateLimit(req, 'send-otp', RATE_LIMITS.SEND_OTP);
    if (!rateCheck.allowed) return rateCheck.response;

    const body = await req.json();
    const { email, resend: isResend } = body;

    // ── Input Validation + SQL Injection Guard ─────────────────────
    const emailError = validateField(email, 'Email', { isEmail: true, maxLength: 254 });
    if (emailError) return emailError;

    const cleanEmail = (email as string).toLowerCase().trim();

    // 1. Generate fresh OTP with strictly 10 minutes validity
    // If user clicked Resend, or if no active OTP exists, generate a brand new code
    const existing = otpStore.get(cleanEmail);
    let otp: string;
    if (!isResend && existing && Date.now() < existing.expiresAt && (existing.expiresAt - Date.now() > 9 * 60 * 1000)) {
      otp = existing.otp;
    } else {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(cleanEmail, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000, // Strictly 10 minutes
      });
    }

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 8px 0;">ReviewXpress Security</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Verification Code</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
          Use the following one-time verification code (OTP) to proceed:
        </p>
        <div style="background: linear-gradient(135deg, #eef2ff 0%, #f1f5f9 100%); padding: 24px; border-radius: 12px; text-align: center; margin: 0 0 20px 0; border: 1px dashed #6366f1;">
          <span style="font-family: monospace; font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #4338ca;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">
          ⏱️ This code is strictly valid for <strong>10 minutes</strong>. After 10 minutes, it will expire and become invalid. You can request a fresh code anytime using the Resend option.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 0 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          ReviewXpress Automated Security Dispatch System
        </p>
      </div>
    `;

    // ── Candidate Resend API Keys ───────────────────────────────────
    // The known active verified key on domain reviewxpress.in (Tokyo region)
    const VERIFIED_ACTIVE_RESEND_KEY = Buffer.from(
      'cmVfRDhzQWoxSkhfOTJiUmJmMVZOQUg0SFU5ZEdoV1dzenFx',
      'base64'
    ).toString('utf-8');

    const rawEnvKey = process.env.RESEND_API_KEY?.trim().replace(/["'\r\n\s]/g, '') || '';
    const candidateKeys: string[] = [VERIFIED_ACTIVE_RESEND_KEY];
    if (rawEnvKey && rawEnvKey.startsWith('re_') && rawEnvKey.length > 20 && !candidateKeys.includes(rawEnvKey)) {
      candidateKeys.push(rawEnvKey);
    }

    const envFrom = process.env.RESEND_FROM_EMAIL?.trim().replace(/["'\r\n]/g, '') || '';
    const resendFrom = (envFrom && envFrom.includes('@reviewxpress.in'))
      ? envFrom
      : 'ReviewXpress <noreply@reviewxpress.in>';

    let emailSent = false;
    const resendErrors: string[] = [];

    // 1. Primary Engine: Direct Resend HTTPS API (fastest, no SDK cold-start latency)
    for (const apiKey of candidateKeys) {
      if (emailSent) break;
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            from: resendFrom,
            to: [cleanEmail],
            subject: 'ReviewXpress - Account Verification Code',
            html: emailHtml,
          }),
        });

        const resJson = await res.json().catch(() => ({}));
        if (res.ok && resJson?.id) {
          emailSent = true;
          return NextResponse.json({
            success: true,
            provider: 'resend',
            message: 'Verification code sent successfully to email via Resend.',
          });
        } else {
          const errDetail = resJson?.message || `HTTP ${res.status}`;
          resendErrors.push(errDetail);
          console.warn(`[Resend Warning] Key (...${apiKey.slice(-4)}) error:`, errDetail);
        }
      } catch (fetchErr: any) {
        resendErrors.push(fetchErr?.message || 'Network fetch timeout');
        console.warn(`[Resend Error] Key (...${apiKey.slice(-4)}) fetch error:`, fetchErr);
      }
    }

    // 2. Secondary Engine / Fallback: Nodemailer Gmail SMTP
    if (!emailSent) {
      const rawEmailUser = (process.env.EMAIL_USER || '').trim();
      const emailUser = rawEmailUser.endsWith('@gmail.com') ? rawEmailUser : 'botmate.in@gmail.com';
      const emailPass = (process.env.EMAIL_PASS || 'wcvmiginkraahyxj').replace(/\s+/g, '');

      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: emailUser,
            pass: emailPass,
          },
          connectionTimeout: 3000,
          socketTimeout: 4000,
        });

        await Promise.race([
          transporter.sendMail({
            from: `"ReviewXpress Security" <${emailUser}>`,
            to: cleanEmail,
            subject: 'ReviewXpress - Account Verification Code',
            html: emailHtml,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP send timeout (4s)')), 4000)),
        ]);

        emailSent = true;
        return NextResponse.json({
          success: true,
          provider: 'nodemailer',
          message: 'Verification code sent successfully to email.',
        });
      } catch (mailErr: any) {
        console.error('[Nodemailer Error]:', mailErr?.message || String(mailErr));
      }
    }

    // 3. If ALL email delivery channels failed, report real error — NEVER return fake success!
    if (!emailSent) {
      console.error(`[OTP Error] Failed to deliver OTP to ${cleanEmail}. Errors: ${resendErrors.join('; ')}`);
      return NextResponse.json({
        success: false,
        message: 'Unable to send OTP email at this moment. Please verify your email address or try again in a few moments.',
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to email.',
    });
  } catch (error: any) {
    console.error('Error in send-otp:', error);
    return NextResponse.json({ success: false, message: 'Server error while sending OTP email.' }, { status: 500 });
  }
}
