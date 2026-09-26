import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, authorizeBusinessAccess } from '@/lib/auth-server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { redisCache } from '@/lib/redis';
import { DEMO_BUSINESSES } from '@/lib/demo-data';
import { updateOwnerAccount } from '@/lib/accounts-store';

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const body = await req.json();
    const { businessId, slug, tags } = body;

    // Validate business authorization if session user is present
    const targetId = businessId || slug;
    if (targetId && sessionUser) {
      const auth = await authorizeBusinessAccess(sessionUser, targetId);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, message: 'Access Denied.' }, { status: 403 });
      }
    }

    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { success: false, message: 'Tags must be an array of strings.' },
        { status: 400 }
      );
    }

    // Constraint 1: Maximum 24 highlights
    if (tags.length > 24) {
      return NextResponse.json(
        { success: false, message: 'Maximum 24 review highlights allowed.' },
        { status: 400 }
      );
    }

    // Constraint 2: Sanitize & validate word limit (max 6 words, max 45 chars per tag)
    const cleanTags: string[] = [];
    for (let rawTag of tags) {
      if (typeof rawTag !== 'string') continue;
      const trimmed = rawTag.trim();
      if (!trimmed) continue;

      const words = trimmed.split(/\s+/);
      if (words.length > 6) {
        return NextResponse.json(
          {
            success: false,
            message: `Highlight "${trimmed.slice(0, 20)}..." exceeds limit of 6 words (current: ${words.length} words).`,
          },
          { status: 400 }
        );
      }

      if (trimmed.length > 45) {
        return NextResponse.json(
          {
            success: false,
            message: `Highlight "${trimmed.slice(0, 20)}..." exceeds limit of 45 characters.`,
          },
          { status: 400 }
        );
      }

      // Avoid duplicates
      if (!cleanTags.includes(trimmed)) {
        cleanTags.push(trimmed);
      }
    }

    const cleanSlug = String(slug || businessId || '').toLowerCase().replace(/^b-/, '').trim();

    // 1. Update Supabase businesses table
    if (isSupabaseConfigured() && cleanSlug) {
      try {
        const { error: dbErr } = await supabase
          .from('businesses')
          .update({ tags: cleanTags })
          .or(`slug.eq.${cleanSlug},id.eq.${cleanSlug}`);

        if (dbErr) {
          console.warn('Supabase tags update warning:', dbErr);
        }
      } catch (err) {
        console.error('Error updating tags in Supabase:', err);
      }
    }

    // 2. Persist in local accounts store and sys-accounts-vault
    try {
      updateOwnerAccount(cleanSlug, { tags: cleanTags });
    } catch (err) {
      console.warn('Local accounts tags update note:', err);
    }

    // 3. Demo fallback
    if (DEMO_BUSINESSES[cleanSlug]) {
      DEMO_BUSINESSES[cleanSlug].tags = cleanTags;
    }

    // 4. Invalidate Redis Caches so /r/[slug] & /dashboard instantly serve the updated highlights
    if (cleanSlug) {
      redisCache.del([
        `store:profile:${cleanSlug}`,
        `store:profile:b-${cleanSlug}`,
      ]).catch(() => {});
      redisCache.delPattern(`store:profile:*`).catch(() => {});
      redisCache.delPattern(`dashboard:*`).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Review highlights updated successfully!',
      tags: cleanTags,
    });
  } catch (error: any) {
    console.error('Error in PUT /api/dashboard/tags:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update review highlights.' },
      { status: 500 }
    );
  }
}
