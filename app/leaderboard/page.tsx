'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import sdk from '@farcaster/frame-sdk';

type ScoreEntry = {
  username: string;
  score: number;
  created_at: string;
};

export default function LiveLeaderboardPage() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error("Farcaster SDK initialization failed:", error);
      }
    };
    initFarcasterSDK();
  }, []);

  useEffect(() => {
    const fetchInitialScores = async () => {
      const { data, error } = await supabase
        .from('scores')
        .select('username, score, created_at')
        .order('score', { ascending: false })
        .limit(20);

      if (error) {
        console.error("Failed to fetch leaderboard:", error);
      } else {
        setScores(data as ScoreEntry[]);
      }
      setIsLoading(false);
    };

    fetchInitialScores();

    const channel = supabase
      .channel('live-leaderboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scores',
        },
        (payload) => {
          const newScore = payload.new as ScoreEntry;
          setScores((currentScores) => {
            const updatedList = [...currentScores, newScore];
            updatedList.sort((a, b) => b.score - a.score);
            return updatedList.slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-400 mt-8">🏆 Live Leaderboard</h1>

      <Link href="/" className="mb-8 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-sm transition-all">
        ← Back to Game
      </Link>

      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700 min-h-[300px] relative">
        
        {isLoading && (
          <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center z-10">
            <p className="text-blue-400 animate-pulse">Loading scores...</p>
          </div>
        )}

        <div className="grid grid-cols-3 bg-blue-900/50 p-3 text-sm font-bold text-blue-200">
          <div>Rank</div>
          <div>Player</div>
          <div className="text-right">Score</div>
        </div>

        <div className="divide-y divide-slate-700">
          {!isLoading && scores.length === 0 && (
              <div className="p-4 text-center text-slate-400">
                  No scores yet. Waiting for players...
              </div>
          )}

          {scores.map((entry, index) => (
            <div key={entry.created_at + entry.username} className="grid grid-cols-3 p-3 items-center hover:bg-slate-700/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="font-bold">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </div>
              <div className="truncate pr-2 font-medium text-blue-100">
                @{entry.username}
              </div>
              <div className="text-right font-bold text-yellow-400 text-lg">
                {entry.score}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        Updates automatically in real-time.
      </p>
    </main>
  );
}