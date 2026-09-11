import { createClient, SupabaseClient } from '@supabase/supabase-js';

const sanitizeUrl = (raw: string): string => {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^["']|["']$/g, '') // strip accidental wrapping quotes from Vercel env input
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '')
    .trim();
};

const sanitizeKey = (raw: string): string => {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^["']|["']$/g, '') // strip accidental wrapping quotes from Vercel env input
    .trim();
};

export const getSupabaseConfig = () => {
  const rawUrl = typeof import.meta.env.VITE_SUPABASE_URL === 'string' ? import.meta.env.VITE_SUPABASE_URL : '';
  const rawKey = typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' ? import.meta.env.VITE_SUPABASE_ANON_KEY : '';

  const url = sanitizeUrl(rawUrl);
  const key = sanitizeKey(rawKey);

  const isConfigured = Boolean(
    url &&
    key &&
    (url.startsWith('http://') || url.startsWith('https://')) &&
    !url.includes('your-project') &&
    !key.includes('your-anon-public-key')
  );

  return { url, key, isConfigured };
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
};

