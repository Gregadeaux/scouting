/**
 * Rate Limiting Middleware
 * Protects authentication endpoints from brute force attacks
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Initialize Redis client for rate limiting
 *
 * NOTE: Requires environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * Setup instructions:
 * 1. Create free Upstash account at https://upstash.com
 * 2. Create a Redis database
 * 3. Copy REST URL and token to .env.local
 */
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * Login rate limiter - Strictest protection
 * 5 attempts per minute per IP
 */
export const loginRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:login',
    })
  : null;

/**
 * Signup rate limiter - Moderate protection
 * 3 attempts per hour per IP
 */
export const signupRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:signup',
    })
  : null;

/**
 * Password reset rate limiter - Moderate protection
 * 3 attempts per hour per IP
 */
export const passwordResetRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:password-reset',
    })
  : null;

/**
 * Extract IP address from request
 * Prioritizes x-forwarded-for header (Vercel/proxy) over request IP
 *
 * SECURITY: We trust x-forwarded-for because Vercel sets it and all traffic
 * goes through Vercel's edge network. If deploying elsewhere, validate this.
 */
function getClientIp(request: NextRequest): string {
  // Try x-forwarded-for header (Vercel, proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client IP)
    return forwardedFor.split(',')[0].trim();
  }

  // Try x-real-ip header (some proxies)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to generic identifier
  // Log in production to investigate why IP extraction failed
  if (process.env.NODE_ENV === 'production') {
    console.warn('Failed to extract client IP, using fallback identifier');
  }
  return 'unknown';
}

/**
 * Apply rate limiting to a request
 *
 * @param request - Next.js request object
 * @param limiter - Ratelimit instance to use
 * @returns NextResponse with 429 status if rate limit exceeded, null otherwise
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await applyRateLimit(request, loginRateLimit);
 *   if (rateLimitResult) return rateLimitResult; // 429 response
 *
 *   // Process request...
 * }
 * ```
 */
export async function applyRateLimit(
  request: NextRequest,
  limiter: Ratelimit | null
): Promise<NextResponse | null> {
  // If rate limiting not configured, allow request (log warning in dev)
  if (!limiter) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️  Rate limiting not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local'
      );
    }
    return null;
  }

  try {
    const identifier = getClientIp(request);
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      // Rate limit exceeded - return 429 with retry information
      // Guard against negative values due to clock skew
      const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          },
        }
      );
    }

    // Rate limit check passed - allow request
    return null;
  } catch (error) {
    // Log rate limiting errors but don't block requests
    // Better to allow requests than block legitimate users due to rate limiter failure
    console.error('Rate limiting error:', error);
    return null;
  }
}
