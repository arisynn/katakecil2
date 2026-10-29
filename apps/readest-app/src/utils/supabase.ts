import { createClient } from '@supabase/supabase-js';
import { getRuntimeConfig } from '@/services/runtimeConfig';

import { KATAKECIL_URL, KATAKECIL_KEY } from '@/services/katakecil/config';
const supabaseUrl = getRuntimeConfig()?.supabaseUrl || KATAKECIL_URL;
const supabaseAnonKey = getRuntimeConfig()?.supabaseAnonKey || KATAKECIL_KEY;

// supabase-js persists the session under a key derived from the URL's first
// host label. Readest Cloud keeps the key from its original host so moving the
// client to another of its hosts doesn't sign everyone out.
const READEST_CLOUD_HOSTS = [
  'readest.supabase.co',
  'vbsyxfusjjqdxkjqlysc.supabase.co',
  'auth.readest.com',
];

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  READEST_CLOUD_HOSTS.includes(new URL(supabaseUrl).hostname)
    ? { auth: { storageKey: 'sb-readest-auth-token' } }
    : undefined,
);

export const createSupabaseClient = (accessToken?: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  });
};

export const createSupabaseAdminClient = () => {
  const supabaseAdminKey = process.env['SUPABASE_ADMIN_KEY'] || '';
  return createClient(supabaseUrl, supabaseAdminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
