'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
// Import SDK Farcaster
import farcaster from '@farcaster/frame-sdk';
// Import Jembatan Supabase
import { supabase } from '@/lib/supabase';

// ==========================================
// BAGIAN 1: KONFIGURASI GAME
// ==========================================
const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;
const GRAVITY = 0.25;
const JUMP = -4.5;
const PIPE_SPEED = 2;
const PIPE_SPAWN_RATE = 1500;
const GAP_SIZE = 120;

export default function FlappyBasedLeaderboardFinalFix() {
  // ==========================================
  // BAGIAN 2: STATE & REFS
  // ==========================================
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<any>(null);
  
  // PENTING: Defaultnya TRUE agar tidak stuck loading di browser biasa
  const [isFarcasterLoaded, setIsFarcasterLoaded] = useState(true);

  // State Database
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const gameState = useRef({
    birdY: GAME_HEIGHT / 2,
    birdVelocity: 0,
    pipes: [] as { x: number; topHeight: number; passed: boolean }[],
    lastPipeSpawn: 0,
  });

  // ==========================================
  // BAGIAN 3: FUNGSI DATABASE
  // ==========================================
  const sendScoreToSupabase = useCallback(async (finalScore: number) => {
    if (!farcasterUser || finalScore === 0 || isSubmitting || isSubmitted) return;

    setIsSubmitting(true);
    console.log(`Mengirim skor ${finalScore} untuk user ${farcasterUser.username}...`);

    const { error } = await supabase
      .from('scores')
      .insert({
        username: farcasterUser.username,
        score: finalScore,
      });

    setIsSubmitting(false);

    if (error) {
      console.error("Gagal mengirim skor:", error.message);
    } else {
      console.log("Skor berhasil masuk database!");
      setIsSubmitted(true);
    }
  }, [farcasterUser, isSubmitting, isSubmitted]);


  // ==========================================
  // BAGIAN 4: EFEK & FUNGSI LOGIKA
  // ==========================================

  // EFEK Pengirim Skor
  useEffect(() => {
    if (isGameOver) {
        sendScoreToSupabase(score);
    }
  }, [isGameOver, score, sendScoreToSupabase]);

  // --- PERBAIKAN UTAMA DI SINI ---
  // EFEK Inisialisasi Farcaster
  useEffect(() => {
    const initFarcaster = async () => {
      // SOLUSI: Panggil .ready() SECEPAT MUNGKIN dan jangan ditunggu (tanpa await)
      // Ini memberi tahu Farcaster untuk menghilangkan splash screen segera.
      farcaster.actions.ready().catch(() => {
          console.log("Info: Bukan di Warpcast native, .ready() diabaikan.");
      });
      
      // Setelah lapor siap, baru pelan-pelan coba ambil data user
      try {
        const context = await farcaster.context;
        if (context && context.user) {
            console.log("User Farcaster ditemukan:", context.user.username);
            setFarcasterUser(context.user);
        }
      } catch (error) {
        console.log("Gagal mengambil context user (normal di browser).");
      }
      // Catatan: isFarcasterLoaded sudah default true, jadi tidak perlu di-set lagi di sini.
    };
    initFarcaster();
  }, []);

  const jump = () => {
    if (isGameOver) return;
    if (!gameStarted) setGameStarted(true);
    gameState.current.birdVelocity = JUMP;
  };

  // Fungsi Reset Game
  const resetGame = () => {
    gameState.current = {
      birdY: GAME_HEIGHT / 2,
      birdVelocity: 0,
      pipes: [],
      lastPipeSpawn: 0,
    };
    setScore(0);
    setIsGameOver(false);
    setGameStarted(false);
    setIsSubmitting(false);
    setIsSubmitted(false);
  };


  // ==========================================
  // BAGIAN 5: GAME LOOP & UI
  // ==========================================
  // (Tidak ada perubahan di bagian ini dari kode sebelumnya)
  useEffect(() => {
    if (!isFarcasterLoaded) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      if (isGameOver) return;

      if (!gameStarted) {
         ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
         ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
         ctx.fillStyle = 'white';
         if (farcasterUser) {
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Hi, @${farcasterUser.username}!`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);
         }
         ctx.font = 'bold 24px sans-serif';
         ctx.textAlign = 'center';
         ctx.fillText('FLAPPY BASED', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
         ctx.font = '16px sans-serif';
         ctx.fillText('Tap to Start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
         animationFrameId = requestAnimationFrame(gameLoop);
         return;
      }

      const state = gameState.current;
      state.birdVelocity += GRAVITY;
      state.birdY += state.birdVelocity;

      if (timestamp - state.lastPipeSpawn > PIPE_SPAWN_RATE) {
        const minTopPipeHeight = 50;
        const maxTopPipeHeight = GAME_HEIGHT - GAP_SIZE - 150;
        const topHeight = Math.random() * (maxTopPipeHeight - minTopPipeHeight) + minTopPipeHeight;
        state.pipes.push({ x: GAME_WIDTH, topHeight, passed: false });
        state.lastPipeSpawn = timestamp;
      }

      state.pipes.forEach((pipe, index) => {
        pipe.x -= PIPE_SPEED;
        const birdX = 50; const birdSize = 24; const pipeWidth = 52;
        const hitTop = birdX + birdSize > pipe.x && birdX < pipe.x + pipeWidth && state.birdY < pipe.topHeight;
        const hitBottom = birdX + birdSize > pipe.x && birdX < pipe.x + pipeWidth && state.birdY + birdSize > pipe.topHeight + GAP_SIZE;
        if (hitTop || hitBottom) setIsGameOver(true);

        if (!pipe.passed && birdX > pipe.x + pipeWidth) {
            setScore(prev => prev + 1);
            pipe.passed = true;
        }
        if (pipe.x + pipeWidth < -10) state.pipes.splice(index, 1);
      });

      if (state.birdY > GAME_HEIGHT - 30 || state.birdY < -50) setIsGameOver(true);

      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#0038AB'; ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 2;
      state.pipes.forEach(pipe => {
          ctx.fillRect(pipe.x, 0, 52, pipe.topHeight); ctx.strokeRect(pipe.x, 0, 52, pipe.topHeight);
          ctx.fillRect(pipe.x, pipe.topHeight + GAP_SIZE, 52, GAME_HEIGHT); ctx.strokeRect(pipe.x, pipe.topHeight + GAP_SIZE, 52, GAME_HEIGHT);
      });
      ctx.fillStyle = '#FCD34D'; ctx.beginPath(); ctx.arc(50 + 12, state.birdY + 12, 12, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(50 + 18, state.birdY + 8, 3, 0, 2 * Math.PI); ctx.fill();

      if (gameStarted && !isGameOver) {
        ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(score.toString(), GAME_WIDTH / 2, 80); ctx.strokeText(score.toString(), GAME_WIDTH / 2, 80);
      }

      if (!isGameOver) animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isGameOver, gameStarted, score, isFarcasterLoaded, farcasterUser]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      
      {/* Hapus overlay loading karena isFarcasterLoaded default true */}

      <h1 className="text-3xl font-bold mb-2 text-blue-400">Flappy Based</h1>
      {farcasterUser && (
         <p className="mb-4 text-sm text-slate-300">Playing as: <span className="font-bold text-white">@{farcasterUser.username}</span></p>
      )}
      
      <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-blue-500">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onClick={jump}
          className="cursor-pointer bg-blue-500 block"
        />

        {isGameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 p-4">
            <p className="text-4xl text-red-500 font-bold mb-2">Game Over!</p>
            
            <div className="bg-slate-800 p-4 rounded-lg mb-6 text-center shadow-lg border border-slate-600 w-full max-w-[200px]">
                <p className="text-sm text-slate-400">YOUR SCORE</p>
                <p className="text-5xl font-bold text-white">{score}</p>
            </div>
            
            <button 
              onClick={resetGame}
              className="w-full max-w-[200px] mb-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-bold transition-all active:scale-95"
            >
              Try Again 
            </button>

            <div className="mt-4 w-full max-w-[200px] text-center h-12 flex items-center justify-center">
                {isSubmitting && (
                    <p className="text-slate-400 animate-pulse flex items-center gap-2 justify-center">
                      <span className="inline-block animate-spin">⏳</span> Sending Score...
                    </p>
                )}
                {!isSubmitting && isSubmitted && farcasterUser && (
                    <p className="text-green-400 font-bold flex items-center gap-2 justify-center">
                      ✅ Saved to Leaderboard!
                    </p>
                )}
                {!isSubmitting && !isSubmitted && !farcasterUser && score > 0 && (
                    <p className="text-xs text-slate-500">(Score not saved: No Farcaster user detected)</p>
                )}
                {!isSubmitting && !isSubmitted && score === 0 && (
                     <p className="text-xs text-slate-500">(Score 0 not saved)</p>
                )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}