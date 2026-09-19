import { NextRequest, NextResponse } from 'next/server';
import { registerNewBusiness } from '@/lib/demo-data';
import { saveOwnerAccount, getAllOwnerAccounts, getAccountBySlug } from '@/lib/accounts-store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { otpStore } from '@/lib/otp-store';

export async function GET() {
  try {
    const accounts = getAllOwnerAccounts();
    const stores = accounts.map((a) => ({
      name: a.businessName,
      slug: a.businessSlug,
      email: a.email,
      password: a.password,
      category: a.category || 'general',
      createdAt: a.createdAt,
    }));
    return NextResponse.json({ success: true, stores });
  } catch (err: any) {
    console.error('Error in register-owner GET:', err);
    return NextResponse.json({ success: false, stores: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, businessName, googleReviewLink, category = "auto", otp } = body;

    // Strict field validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid store / business name.' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return NextResponse.json(
        { success: false, message: 'Business Category is mandatory.' },
        { status: 400 }
      );
    }

    // Password validation: strictly 8 characters with special symbol
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password || '');
    if (!password || password.length !== 8 || !hasSymbol) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must be strictly 8 characters long (neither more nor less) and contain at least 1 special symbol (@, #, $, %, !, *).',
        },
        { status: 400 }
      );
    }

    // Google Maps Link validation
    if (!googleReviewLink || typeof googleReviewLink !== 'string' || !googleReviewLink.trim() || googleReviewLink.trim().length < 5) {
      return NextResponse.json(
        { success: false, message: 'Google Maps Review Link is mandatory. Please provide a valid link.' },
        { status: 400 }
      );
    }

    // OTP validation
    if (!otp) {
      return NextResponse.json(
        { success: false, message: 'OTP is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const storedOtpData = otpStore.get(cleanEmail);
    if (!storedOtpData) {
      return NextResponse.json(
        { success: false, message: 'No OTP found for this email. Please request a new one.' },
        { status: 400 }
      );
    }

    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(cleanEmail);
      return NextResponse.json(
        { success: false, message: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (storedOtpData.otp !== otp.trim()) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP.' },
        { status: 400 }
      );
    }

    // OTP verified successfully -> clear it
    otpStore.delete(cleanEmail);

    let cleanSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || ('store-' + Date.now().toString().slice(-4));

    // Check for slug collisions with other emails
    const existingStoreWithSlug = getAccountBySlug(cleanSlug);
    if (existingStoreWithSlug && existingStoreWithSlug.email.toLowerCase() !== cleanEmail) {
      cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    }

    let cleanReviewLink = googleReviewLink.trim();
    if (cleanReviewLink.startsWith('https://g.page/r/') && !cleanReviewLink.endsWith('/review')) {
      cleanReviewLink = cleanReviewLink + '/review';
    }

    const defaultTags = [
      'Fast & Friendly Service',
      'High Quality Experience',
      'Clean & Welcoming Ambience',
      'Polite Staff',
      'Great Value for Money',
      'Highly Recommended',
    ];

    const newBusiness: Business = {
      id: 'b-' + cleanSlug,
      name: businessName.trim(),
      slug: cleanSlug,
      category: category,
      google_review_link: cleanReviewLink,
      tags: defaultTags,
      is_active: true,
    };

    // Save in demo in-memory storage
    registerNewBusiness(newBusiness);

    // Save in persistent accounts store
    saveOwnerAccount({
      email: cleanEmail,
      password: password,
      businessName: businessName.trim(),
      businessSlug: cleanSlug,
      category: category,
      googleReviewLink: cleanReviewLink,
    });

    // Save in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { error: dbErr } = await supabase.from('businesses').upsert([
          {
            name: newBusiness.name,
            slug: newBusiness.slug,
            google_review_link: newBusiness.google_review_link,
            tags: newBusiness.tags,
            is_active: true,
          },
        ]);
        if (dbErr) {
          console.warn('Supabase business upsert notice:', dbErr);
        }
      } catch (dbErr) {
        console.warn('Database sync note:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Owner account and store scanner generated successfully!',
      business: newBusiness,
      customerFlowUrl: `/r/${cleanSlug}`,
      qrStandeeUrl: `/qr/${cleanSlug}`,
      googleReviewLink: cleanReviewLink,
    });
  } catch (err: any) {
    console.error('Error in register-owner route:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal registration error.' },
      { status: 500 }
    );
  }
}
