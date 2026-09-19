import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const memory = process.memoryUsage ? process.memoryUsage() : null;
    const isDbReady = isSupabaseConfigured();

    return NextResponse.json(
      {
        status: 'ok',
        service: 'ReviewXpress',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'production',
        database: isDbReady ? 'connected' : 'local-storage',
        memoryMb: memory ? Math.round(memory.rss / (1024 * 1024)) : undefined,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'ReviewXpress',
        timestamp: new Date().toISOString(),
        error: error?.message || 'Health check error',
      },
      {
        status: 200, // Return 200 so Render doesn't restart during transient health check hiccups
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
