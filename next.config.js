/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ─── HTTP Security Headers ─────────────────────────────────────────────────
  // Applied to all routes. Protects against XSS, clickjacking, sniffing, etc.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent browsers from MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking (deny embedding in iframes on other origins)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Block XSS in legacy browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Control referrer information leakage
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Strict HTTPS enforcement (HSTS) — 1 year in production
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Permissions policy: restrict access to sensitive browser APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          // Content Security Policy
          // - default-src 'self': only load from same origin by default
          // - script-src: allow same-origin + Cloudflare Turnstile + Next.js inline
          // - style-src: allow same-origin + unsafe-inline (needed by Tailwind CSS)
          // - img-src: allow same-origin + data URIs + common CDNs
          // - connect-src: allow Supabase + Resend + Gemini APIs
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.resend.com https://generativelanguage.googleapis.com https://challenges.cloudflare.com",
              "frame-src 'self' https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      // ── API Routes: additional no-cache headers ─────────────────────────────
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
