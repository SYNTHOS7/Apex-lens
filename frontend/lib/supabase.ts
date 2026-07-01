import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Bulletproof validation to ensure a valid URL format during Next.js build and prerendering
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  supabaseUrl = 'https://placeholder-project.supabase.co';
  supabaseAnonKey = 'placeholder-anon-key';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
