import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/config';

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
