/* Security headers.
 *
 * The production site shipped none of these. On a page that asks a visitor to sign a message
 * with their wallet, the two that matter most are frame-ancestors (nobody frames the signing UI
 * and clickjacks the approval) and HSTS (nobody strips the TLS the session cookie rides on).
 *
 * CSP notes — why it is not stricter:
 *   script-src keeps 'unsafe-inline' because the theme-restore script in app/layout.js runs
 *   before first paint to avoid a light/dark flash, and Next's own bootstrap is inline too. A
 *   nonce would fix both, but a nonce must be generated per request, which forces every page out
 *   of the static prerender the marketing site is built on. Clickjacking and TLS stripping are
 *   the live risks here; inline-script injection is not, because no page renders user-supplied
 *   HTML except the agent reply, which goes through lib/text.js's own renderer.
 *
 *   accounts.google.com appears in script-src/frame-src/connect-src because components/AuthGate.jsx
 *   injects the GSI client at runtime (AuthGate.jsx:40) and Google renders its button in an iframe.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com https://www.googleapis.com",
      "frame-src https://accounts.google.com",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      /* The signing UI must never render inside someone else's page. */
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  /* Two years, subdomains included. No `preload` on purpose: this host is a sslip.io wildcard,
     and submitting a name that is not ours to the preload list is not our call to make. */
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* The app asks for the microphone (voice input) and nothing else. */
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Version disclosure, free to anyone running `curl -I`. */
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
