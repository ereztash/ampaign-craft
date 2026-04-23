import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Fallback placeholders keep the module importable in contexts where env vars
// aren't populated (unit tests, storybook, misconfigured dev env). Real network
// calls fail loudly against these hosts; module import stays safe.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});
