import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://bciyxglcayukxudeuaru.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXl4Z2xjYXl1a3h1ZGV1YXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjUzNjQsImV4cCI6MjEwMjY0MTM2NH0.SAOm-4WBTKmwRp___dGLdVdlolyDhtdanqB3GfqB-5U';

export const isSupabaseConfigured = true;

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  };
}
