import { createClient } from '@supabase/supabase-js';

// Membaca URL dan Kunci dari file .env.local yang sudah Anda isi tadi.
// Tanda seru (!) di belakang artinya kita menyuruh program untuk
// "Yakin saja kalau datanya ada, jangan khawatir."
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Membuat dan mengekspor "klien" supabase yang siap pakai oleh file lain
export const supabase = createClient(supabaseUrl, supabaseAnonKey);