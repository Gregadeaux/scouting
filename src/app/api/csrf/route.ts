/**
 * CSRF Token API Route
 *
 * GET /api/csrf - Returns a CSRF token and sets it as a cookie
 */

import { NextResponse } from 'next/server';
import { getCsrfToken } from '@/lib/csrf/server';

export async function GET() {
  try {
    const token = await getCsrfToken();

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate CSRF token',
      },
      { status: 500 }
    );
  }
}
