import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tlyeyphchmxuqrefvcoj.supabase.co/rest/v1/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRseWV5cGhjaG14dXFyZWZ2Y29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDYxMDEsImV4cCI6MjEwMzgyMjEwMX0.h4wbuTdzSB5TSD7DQTqInS-Pyfp3_WExhY54dpE0QUM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);