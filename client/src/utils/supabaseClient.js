import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qpguvnudjjifdshytasx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZ3V2bnVkamppZmRzaHl0YXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDgzNTMsImV4cCI6MjA4NTEyNDM1M30.Z8PQ1wI8elv0U3uThNJTjeuzFXPTQWbRy7XkjZ2NuYo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
