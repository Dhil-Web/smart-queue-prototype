import { createClient } from '@supabase/supabase-js';

// Pastikan TIDAK ADA garis miring (/) atau path tambahan seperti /rest/v1 di belakangnya
const supabaseUrl = 'https://tlyeyphchmxuqrefvcoj.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_p7NuRgoOOAi_xN5m1eLyzg_BQ14vGAA'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);