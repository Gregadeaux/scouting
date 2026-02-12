import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking by blocking iframe embedding
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection (legacy but still useful)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy - Defense in depth against XSS and data injection
          {
            key: 'Content-Security-Policy',
            value: [
              // Default: only same-origin resources
              "default-src 'self'",
              // Scripts: allow Next.js scripts and eval for development
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              // Styles: allow inline styles for Tailwind CSS
              "style-src 'self' 'unsafe-inline'",
              // Images: allow Supabase storage and data URIs for PWA icons
              "img-src 'self' https://*.supabase.co data: blob:",
              // Fonts: allow same-origin and data URIs
              "font-src 'self' data:",
              // Connect: allow Supabase API and auth domains
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel-insights.com",
              // Media: allow Supabase storage
              "media-src 'self' https://*.supabase.co",
              // Objects: block all plugins (Flash, Java, etc.)
              "object-src 'none'",
              // Base URI: restrict to same origin
              "base-uri 'self'",
              // Form actions: only same origin
              "form-action 'self'",
              // Frame ancestors: block all framing (duplicates X-Frame-Options)
              "frame-ancestors 'none'",
              // Upgrade insecure requests in production only
              // (breaks local dev over IP since there's no HTTPS)
              ...(process.env.NODE_ENV === 'production' ? [
                "upgrade-insecure-requests",
                "block-all-mixed-content",
              ] : []),
            ].join('; '),
          },
          // Permissions Policy - Disable unnecessary browser features
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',        // No camera access
              'microphone=()',    // No microphone access
              'geolocation=()',   // No geolocation (scouting is at known venues)
              'payment=()',       // No payment APIs
              'usb=()',           // No USB access
              'magnetometer=()',  // No magnetometer
              'gyroscope=()',     // No gyroscope
              'accelerometer=()', // Keep accelerometer for mobile detection
              'fullscreen=(self)', // Allow fullscreen only on same origin
              'picture-in-picture=()', // No PiP
            ].join(', '),
          },
          // Strict-Transport-Security - Force HTTPS (only in production)
          ...(process.env.NODE_ENV === 'production' ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload',
            },
          ] : []),
        ],
      },
    ];
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development' && process.env.ENABLE_PWA_DEV !== 'true',
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    importScripts: ['/sw-custom.js'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'supabase-storage-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
          },
        },
      },
      {
        urlPattern: /\/api\/matches.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'match-schedules-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 2, // 2 hours
          },
        },
      },
      {
        urlPattern: /\/api\/teams.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'teams-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
        },
      },
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      {
        urlPattern: /\/_next\/image.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-image-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
    ],
  },
})(nextConfig);
