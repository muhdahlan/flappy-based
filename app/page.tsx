'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import farcaster from '@farcaster/miniapp-sdk'; // Import Farcaster SDK
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ==========================================
// KONFIGURASI GAME
// ==========================================
const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;
const GRAVITY = 0.25;
const JUMP = -4.5;
const PIPE_SPEED = 2;
const PIPE_SPAWN_RATE = 1500;
const GAP_SIZE = 120;

export default function FlappyBasedFinalUI() {
  // ==========================================
  // STATE & REFS
  // ==========================================
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<any>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const gameState = useRef({
    birdY: GAME_HEIGHT / 2,
    birdVelocity: 0,
    pipes: [] as { x: number; topHeight: number; passed: boolean }[],
    lastPipeSpawn: 0,
  });

  // ==========================================
  // FUNGSI DATABASE & FARCASTER
  // ==========================================
  const sendScoreToSupabase = useCallback(async (finalScore: number) => {
    if (!farcasterUser || finalScore === 0 || isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('scores').insert({
        username: farcasterUser.username,
        score: finalScore,
      });
    setIsSubmitting(false);
    if (!error) setIsSubmitted(true);
  }, [farcasterUser, isSubmitting, isSubmitted]);

  useEffect(() => {
    if (isGameOver) sendScoreToSupabase(score);
  }, [isGameOver, score, sendScoreToSupabase]);

  // ==========================================
  // INISIALISASI FARCASTER SDK
  // ==========================================
  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        // Panggilan KRUSIAL ini memberi tahu Warpcast bahwa Mini App siap
        await farcaster.actions.ready();
        // console.log("Farcaster Mini App is ready.");

        // Sekarang, coba dapatkan konteks pengguna
        const context = await farcaster.context;
        if (context?.user) {
          setFarcasterUser(context.user);
          // console.log("Farcaster User Context loaded:", context.user);
        } else {
          // console.log("Farcaster user context not available.");
        }
      } catch (error) {
        // console.error("Farcaster SDK initialization failed:", error);
      }
    };

    initFarcasterSDK();
  }, []); // Array dependensi kosong agar hanya berjalan sekali saat komponen dimuat

  // ==========================================
  // LOGIKA GAME
  // ==========================================
  const jump = () => {
    if (isGameOver) return;
    if (!gameStarted) setGameStarted(true);
    gameState.current.birdVelocity = JUMP;
  };

  const resetGame = () => {
    gameState.current = { birdY: GAME_HEIGHT / 2, birdVelocity: 0, pipes: [], lastPipeSpawn: 0 };
    setScore(0); setIsGameOver(false); setGameStarted(false); setIsSubmitting(false); setIsSubmitted(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      if (isGameOver) return;

      // --- TAMPILAN AWAL (START SCREEN) ---
      if (!gameStarted) {
         ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
         // Latar belakang biru cerah untuk area game
         ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
         ctx.fillStyle = 'white';
         
         ctx.font = 'bold 28px sans-serif';
         ctx.textAlign = 'center';
         ctx.fillText('FLAPPY BASED', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
         
         ctx.font = '18px sans-serif';
         ctx.fillText('Tap to Start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
         animationFrameId = requestAnimationFrame(gameLoop);
         return;
      }

      // --- LOGIKA GAME BERJALAN ---
      const state = gameState.current;
      state.birdVelocity += GRAVITY;
      state.birdY += state.birdVelocity; // <--- BARIS INI SUDAH DIKOREKSI
      
      if (timestamp - state.lastPipeSpawn > PIPE_SPAWN_RATE) {
        const minTop = 50; const maxTop = GAME_HEIGHT - GAP_SIZE - 150;
        const topHeight = Math.random() * (maxTop - minTop) + minTop;
        state.pipes.push({ x: GAME_WIDTH, topHeight, passed: false });
        state.lastPipeSpawn = timestamp;
      }

      state.pipes.forEach((pipe, index) => {
        pipe.x -= PIPE_SPEED;
        const birdX = 50; const birdSize = 24; const pipeWidth = 52;
        const hitTop = birdX + birdSize > pipe.x && birdX < pipe.x + pipeWidth && state.birdY < pipe.topHeight;
        const hitBottom = birdX + birdSize > pipe.x && birdX < pipe.x + pipeWidth && state.birdY + birdSize > pipe.topHeight + GAP_SIZE;
        if (hitTop || hitBottom) setIsGameOver(true);
        if (!pipe.passed && birdX > pipe.x + pipeWidth) { setScore(p => p + 1); pipe.passed = true; }
        if (pipe.x + pipeWidth < -10) state.pipes.splice(index, 1);
      });

      if (state.birdY > GAME_HEIGHT - 30 || state.birdY < -50) setIsGameOver(true);

      // --- MENGGAMBAR (RENDERING) ---
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Langit Biru
      ctx.fillStyle = '#0047CC'; ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20); // Tanah (Biru lebih tua)
      
      // Pipa (Putih)
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 2;
      state.pipes.forEach(pipe => {
          ctx.fillRect(pipe.x, 0, 52, pipe.topHeight);
          ctx.fillRect(pipe.x, pipe.topHeight + GAP_SIZE, 52, GAME_HEIGHT);
      });
      
      // Burung (Kuning/Oranye)
      ctx.fillStyle = '#FCD34D'; ctx.beginPath(); ctx.arc(50 + 12, state.birdY + 12, 12, 0, 2 * Math.PI); ctx.fill();
      
      // Skor saat bermain
      if (gameStarted && !isGameOver) {
        ctx.fillStyle = 'white'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(score.toString(), GAME_WIDTH / 2, 80);
      }

      if (!isGameOver) animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isGameOver, gameStarted, score, farcasterUser]);

  // ==========================================
  // TAMPILAN UTAMA (UI)
  // ==========================================
  return (
    <main className="flex flex-col items-center justify-start pt-10 min-h-screen bg-[#0052FF] text-white p-4 overflow-hidden">
      
      {/* HEADER: Judul dan Username */}
      <div className="text-center mb-6 z-10">
        <h1 className="text-4xl font-extrabold drop-shadow-md tracking-tight">
          Flappy Based
        </h1>
        {farcasterUser && (
           <p className="text-lg text-blue-100 mt-1 font-medium">
             Playing as: <span className="font-bold text-white">@{farcasterUser.username}</span>
           </p>
        )}
      </div>
      
      {/* AREA GAME */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#0052FF]">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onClick={jump}
          className="cursor-pointer block"
        />

        {/* OVERLAY GAME OVER */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-20 p-4 backdrop-blur-sm">
            <p className="text-5xl text-white font-extrabold mb-4 drop-shadow-lg">Game Over!</p>
            
            <div className="bg-white/10 p-6 rounded-xl mb-6 text-center shadow-lg border border-white/20 w-full max-w-[220px]">
                <p className="text-sm text-blue-200 uppercase tracking-wider font-bold">Your Score</p>
                <p className="text-6xl font-black text-white mt-1">{score}</p>
            </div>
            
            <button 
              onClick={resetGame}
              className="w-full max-w-[220px] mb-3 px-6 py-4 bg-white text-[#0052FF] hover:bg-blue-50 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-md"
            >
              Try Again 
            </button>

            {/* Status Database */}
            <div className="mt-2 h-8 flex items-center justify-center font-medium">
                {isSubmitting && <p className="text-blue-200 flex items-center gap-2"><span className="animate-spin">⏳</span> Sending...</p>}
                {isSubmitted && <p className="text-green-400 flex items-center gap-2">✅ Saved!</p>}
            </div>

            {/* Tombol Leaderboard */}
            <div className="mt-4 w-full max-w-[220px]">
                <Link 
                  href="/leaderboard"
                  className="w-full px-6 py-4 bg-[#0047CC] hover:bg-[#003DB3] rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md border border-white/20"
                >
                   <span>🏆</span> Leaderboard
                </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
