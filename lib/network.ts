import os from 'os';

/**
 * Returns the detected local IPv4 network address (e.g. 192.168.1.x or 10.x.x.x)
 * Supports both Windows (Wi-Fi, Ethernet) and Linux/macOS (eth0, wlan0, en0).
 */
export function getLocalNetworkIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    // 1. Prioritize Wi-Fi or physical Ethernet
    for (const name of Object.keys(interfaces)) {
      const lower = name.toLowerCase();
      const isPhysical =
        lower.includes('wi-fi') ||
        lower.includes('ethernet') ||
        lower.startsWith('eth') ||
        lower.startsWith('wlan') ||
        lower.startsWith('en');

      if (isPhysical && !lower.includes('vethernet') && !lower.includes('docker') && !lower.includes('br-')) {
        for (const net of interfaces[name] || []) {
          if (net.family === 'IPv4' && !net.internal && net.address) {
            return net.address;
          }
        }
      }
    }

    // 2. Fallback to any active non-internal IPv4
    for (const name of Object.keys(interfaces)) {
      const lower = name.toLowerCase();
      if (!lower.includes('vethernet') && !lower.includes('docker') && !lower.includes('br-')) {
        for (const net of interfaces[name] || []) {
          if (net.family === 'IPv4' && !net.internal && net.address) {
            return net.address;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Network IP detection notice:', e);
  }

  return '127.0.0.1';
}

/**
 * Gets the authoritative public base URL for this deployment.
 * Supports Render (RENDER_EXTERNAL_URL), custom domains (NEXT_PUBLIC_APP_URL),
 * browser origins, and local development IP fallbacks.
 */
export function getBaseUrl(): string {
  // 1. Explicit custom domain or app URL configured in environment
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim().length > 0) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '');
  }

  // 2. Automatic Render deployment URL provided by Render runtime
  if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim().length > 0) {
    let renderUrl = process.env.RENDER_EXTERNAL_URL.trim();
    if (!renderUrl.startsWith('http://') && !renderUrl.startsWith('https://')) {
      renderUrl = 'https://' + renderUrl;
    }
    return renderUrl.replace(/\/+$/, '');
  }

  // 3. Vercel deployment URL fallback
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim().length > 0) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
  }

  // 4. Client-side browser window origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // 5. Local development fallback using detected IP (allows physical phone testing on local network)
  const port = process.env.PORT || '3000';
  const localIp = getLocalNetworkIp();
  if (localIp && localIp !== '127.0.0.1') {
    return `http://${localIp}:${port}`;
  }

  return `http://localhost:${port}`;
}
