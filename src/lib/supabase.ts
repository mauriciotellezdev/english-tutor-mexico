/**
 * Supabase Client Configuration
 *
 * Environment variables needed:
 * - PUBLIC_SUPABASE_URL
 * - PUBLIC_SUPABASE_ANON_KEY
 *
 * These should be set in your deployment environment
 * (Cloudflare Pages environment variables, or .env.local for dev)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing environment variables. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Helper: Get current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase] Error getting session:', error.message);
    return null;
  }
  return session;
}

/**
 * Helper: Get current user profile
 */
export async function getUserProfile() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('[Supabase] Error getting profile:', error.message);
    return null;
  }

  return data;
}

/**
 * Helper: Check if user is teacher
 */
export async function isTeacher() {
  const profile = await getUserProfile();
  return profile?.role === 'teacher';
}
