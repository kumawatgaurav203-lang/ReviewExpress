/**
 * lib/keep-alive.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 24/7 Anti-Sleep Keep-Alive Heartbeat Engine
 *
 * Automatically sends lightweight pings to prevent Render/Cloud instances
 * from spinning down due to inactivity. Runs 100% free with zero overhead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PING_INTERVAL_MS = 8 * 60 * 1000; // Every 8 minutes (Render sleeps after 15 min)

let isKeepAliveStarted = false;

export function startKeepAlive() {
  if (isKeepAliveStarted) return;
  if (typeof window !== 'undefined') return; // Server-side only
  if (process.env.NODE_ENV !== 'production') return; // Production only

  isKeepAliveStarted = true;

  // Run first ping after 1 minute, then every 8 minutes
  setTimeout(() => {
    const pingSelf = async () => {
      try {
        const targetHost =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : null) ||
          'https://reviewxpress.in';

        const cleanUrl = `${targetHost.replace(/\/+$/, '')}/api/health?heartbeat=${Date.now()}`;
        
        await fetch(cleanUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'ReviewXpress-AntiSleep-Daemon/1.0',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (err) {
        // Silently ignore transient network hiccups
      }
    };

    pingSelf();
    const interval = setInterval(pingSelf, PING_INTERVAL_MS);
    interval.unref?.();
  }, 60 * 1000);
}

// Auto-start on module import
if (process.env.NODE_ENV === 'production') {
  startKeepAlive();
}
