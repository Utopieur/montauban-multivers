import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ton-projet.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'ta-cle-anon';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
