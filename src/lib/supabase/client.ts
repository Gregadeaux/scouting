/**
 * Supabase browser client
 * Uses createBrowserClient from @supabase/ssr to store session in cookies
 * This ensures the session is available to both client and server (middleware)
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Single browser client instance - uses cookies for session storage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
