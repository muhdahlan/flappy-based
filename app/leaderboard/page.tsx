// app/leaderboard/page.tsx

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Ini adalah fitur Next.js agar data tidak di-cache selamanya.
// Data akan diperbarui setiap kali halaman dibuka (0 detik).
export const revalidate = 0;

export default async function LeaderboardPage() {
  // --- BAGIAN 1: MENGAMBIL DATA DARI SUPABASE (SERVER-SIDE) ---
  // Kita minta data: username, score, dan waktu dibuat
  // Diurutkan berdasarkan 'score' dari tinggi ke rendah (descending)
  // Dibatasi hanya 20 teratas
  const { data: scores, error } = await supabase
    .from('scores')
    .select('username, score, created_at')
    .order('score', { ascending: false })
    .limit(20);

  if (error) {
    console.error("Gagal mengambil leaderboard:", error);
  }

  // --- BAGIAN 2: TAMPILAN HTML (UI) ---
  return (
    <main className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-400 mt-8">🏆 Top Players</h1>

      {/* Tombol Kembali ke Game */}
      <Link href="/" className="mb-8 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-sm transition-all">
        ← Back to Game
      </Link>

      {/* Wadah Tabel Leaderboard */}
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Header Tabel */}
        <div className="grid grid-cols-3 bg-blue-900/50 p-3 text-sm font-bold text-blue-200">
          <div>Rank</div>
          <div>Player</div>
          <div className="text-right">Score</div>
        </div>

        {/* Isi Tabel (Looping Data Scores) */}
        <div className="divide-y divide-slate-700">
          {/* Jika data kosong atau error */}
          {(!scores || scores.length === 0) && (
              <div className="p-4 text-center text-slate-400">
                  No scores yet. Be the first!
              </div>
          )}

          {/* Jika ada data, kita 'map' (ulang) satu per satu */}
          {scores?.map((entry, index) => (
            <div key={index} className="grid grid-cols-3 p-3 items-center hover:bg-slate-700/50 transition-colors">
              {/* Kolom Rank (Peringkat 1, 2, 3 pakai emoji piala) */}
              <div className="font-bold">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </div>
              
              {/* Kolom Player */}
              <div className="truncate pr-2 font-medium text-blue-100">
                @{entry.username}
              </div>
              
              {/* Kolom Score */}
              <div className="text-right font-bold text-yellow-400 text-lg">
                {entry.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}