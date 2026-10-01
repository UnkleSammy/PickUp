import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const SUPABASE_CONFIG_ERROR =
  'Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and ' +
  'EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment, then restart the app.';

export class SupabaseConfigurationError extends Error {
  constructor(message: string = SUPABASE_CONFIG_ERROR) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

let client: SupabaseClient<Database> | null = null;

/**
 * Lazily creates and caches the Supabase client. Throws a clear, user-facing
 * error when configuration is missing so callers can fail gracefully instead
 * of crashing on an undefined URL/key. Never hardcodes secrets.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new SupabaseConfigurationError();
  }
  if (!client) {
    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
