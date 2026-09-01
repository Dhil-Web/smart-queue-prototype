import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'MASUKKAN_PROJECT_URL_SUPABASE_DI_SINI';
const supabaseAnonKey = 'MASUKKAN_ANON_PUBLIC_KEY_DI_SINI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);