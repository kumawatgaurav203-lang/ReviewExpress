import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { otpStore } from '@/lib/otp-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();



    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in memory, valid for 10 minutes
    otpStore.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || 'ReviewXpress <onboarding@resend.dev>';

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 8px 0;">ReviewXpress Security</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Store Onboarding Verification Code</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
          Use the following one-time verification code (OTP) to complete your client store onboarding:
        </p>
        <div style="background: linear-gradient(135deg, #eef2ff 0%, #f1f5f9 100%); padding: 24px; border-radius: 12px; text-align: center; margin: 0 0 20px 0; border: 1px dashed #6366f1;">
          <span style="font-family: monospace; font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #4338ca;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">
          ⏱️ This code is valid for strictly <strong>10 minutes</strong>. If you did not initiate this request, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 0 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          ReviewXpress Automated Security Dispatch System
        </p>
      </div>
    `;

    // 1. Primary Engine: Resend API
    let isSentViaResend = false;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const { data, error } = await resend.emails.send({
          from: resendFrom,
          to: cleanEmail,
          subject: 'ReviewXpress - Account Verification Code',
          html: emailHtml,
        });

        if (data && !error) {
          isSentViaResend = true;
          return NextResponse.json({
            success: true,
            provider: 'resend',
            message: 'OTP sent successfully to email via Resend.',
          });
        } else if (error) {
          console.warn('[Resend Warning] Resend send error, falling back to Gmail:', error);
        }
      } catch (resendErr) {
        console.warn('[Resend Error] Caught exception, falling back to Gmail:', resendErr);
      }
    }

    // 2. Secondary Engine / Fallback: Nodemailer Gmail SMTP
    if (!isSentViaResend && emailUser && emailPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        });

        // 8-second timeout on nodemailer sendMail
        await Promise.race([
          transporter.sendMail({
            from: `"ReviewXpress Security" <${emailUser}>`,
            to: cleanEmail,
            subject: 'ReviewXpress - Account Verification Code',
            html: emailHtml,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP send timeout')), 8000)),
        ]);

        return NextResponse.json({
          success: true,
          provider: 'nodemailer',
          message: 'OTP sent successfully to email.',
        });
      } catch (mailErr) {
        console.error('[Nodemailer Error]:', mailErr);
      }
    }

    if (!resendApiKey && (!emailUser || !emailPass)) {
      console.error('[Email Error] Neither Resend nor Nodemailer credentials are configured in .env');
      return NextResponse.json(
        {
          success: false,
          message: 'Server email configuration is missing.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to dispatch verification email through configured providers.',
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Error in send-otp:', error);
    return NextResponse.json({ success: false, message: 'Server error while sending OTP email.' }, { status: 500 });
  }
}
