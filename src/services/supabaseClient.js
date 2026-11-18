import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

/**
 * Membaca konfigurasi URL dan Anon Key Supabase dari Vite environment variables.
 */
export function getSupabaseConfig() {
  const url = String(import.meta?.env?.VITE_SUPABASE_URL || '').trim();
  const anonKey = String(import.meta?.env?.VITE_SUPABASE_ANON_KEY || '').trim();
  return { url, anonKey };
}

/**
 * Mengembalikan true jika kredensial Supabase sudah dikonfigurasi dengan format valid.
 */
export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && /^https?:\/\//i.test(url));
}

/**
 * Mengembalikan singleton client Supabase jika tersedia, atau null pada mode lokal.
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!cachedClient) {
    const { url, anonKey } = getSupabaseConfig();
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  return cachedClient;
}
