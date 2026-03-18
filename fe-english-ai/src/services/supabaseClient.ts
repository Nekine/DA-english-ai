import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qochqsiowukxlabgubqg.supabase.co'; // Thay bằng URL của bạn
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvY2hxc2lvd3VreGxhYmd1YnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1OTY4MTUsImV4cCI6MjA1NzE3MjgxNX0.GyZXtzsrxDpRx6shv-yvwsfGG1vHL3Q11cxp_u-_BjQ'; // Thay bằng Anon Key của bạn

export const supabase = createClient(supabaseUrl, supabaseAnonKey);