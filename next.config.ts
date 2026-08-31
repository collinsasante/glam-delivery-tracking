import type { NextConfig } from "next";

const cdnDomain = process.env.CDN_DOMAIN ?? "";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
      "worker-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://${cdnDomain}`,
      "font-src 'self'",
      "connect-src 'self' https://*.googleapis.com https://router.project-osrm.org https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://oauth2.googleapis.com",
      // signInWithPopup() loads a hidden helper iframe from the Firebase
      // authDomain (<project>.firebaseapp.com) to relay the OAuth result back
      // to this page — without this, the popup opens but the CSP blocks the
      // iframe and the sign-in silently fails with auth/unauthorized-domain-
      // looking symptoms even once the domain itself is authorized.
      "frame-src https://*.firebaseapp.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: cdnDomain
      ? [
          {
            protocol: "https",
            hostname: cdnDomain,
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
