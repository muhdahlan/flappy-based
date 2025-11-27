'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import farcaster from '@farcaster/miniapp-sdk';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ==========================================
// KONFIGURASI GAME
// ==========================================
const GAME_WIDTH = 360; // Lebar sedikit ditambah
const GAME_HEIGHT = 640; // Tinggi game diperbesar agar lebih luas
const GRAVITY = 0.25;
const JUMP = -4.5;
const PIPE_SPEED = 2;
const PIPE_SPAWN_RATE = 1500;
const GAP_SIZE = 140; // Celah diperbesar untuk karakter burung
const BIRD_SIZE = 40; // Ukuran burung

// URL gambar burung (menggunakan URL dari Postimage yang Anda berikan)
const BIRD_IMAGE_URL = 'https://i.postimg.cc/yDRH3Yzb/449629522-122153685344220908-2606213258427399354-n.jpg';

export default function FlappyBasedFinalUI() {
  // ==========================================
  // STATE & REFS
  // ==========================================
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdImageRef = useRef<HTMLImageElement | null>(null); // Ref untuk gambar burung
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>('');

  const gameState = useRef({
    birdY: GAME_HEIGHT / 2,
    birdVelocity: 0,
    pipes: [] as { x: number; topHeight: number; passed: boolean }[],
    lastPipeSpawn: 0,
  });

  // ==========================================
  // PRELOAD GAMBAR BURUNG
  // ==========================================
  useEffect(() => {
    const img = new Image();
    img.src = BIRD_IMAGE_URL;
    img.onload = () => {
      birdImageRef.current = img;
    };
  }, []);

  // ==========================================
  // FUNGSI DATABASE & NOTIFIKASI
  // ==========================================
  const sendScoreToSupabase = useCallback(async (finalScore: number) => {
    if (!farcasterUser || finalScore === 0 || isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('scores').insert({
      username: farcasterUser.username,
      score: finalScore,
      fid: farcasterUser.fid,
    });
    setIsSubmitting(false);
    if (!error) setIsSubmitted(true);
  }, [farcasterUser, isSubmitting, isSubmitted]);

  // ==========================================
  // FUNGSI SHARE SCORE
  // ==========================================
  const shareScore = useCallback(() => {
    if (!farcasterUser) return;
    const text = `I just scored ${score} in Flappy Based! Can you beat my score? @${farcasterUser.username} #FlappyBased #Farcaster`;
    const embedUrl = 'https://flappy-based.vercel.app'; // Ganti dengan URL produksi Anda
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embedUrl)}`;
    
    // Buka Warpcast composer
    farcaster.actions.openUrl(shareUrl);
  }, [score, farcasterUser]);

  // ==========================================
  // INISIALISASI FARCASTER SDK
  // ==========================================
  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        await farcaster.actions.ready();
        const context = await farcaster.context;
        if (context?.user) {
          setFarcasterUser(context.user);
          console.log("Farcaster User Context loaded:", context.user);
        }
      } catch (error) {
        console.error("Farcaster SDK initialization failed:", error);
      }
    };
    initFarcasterSDK();
  }, []);

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
    setScore(0);
    setIsGameOver(false);
    setGameStarted(false);
    setIsSubmitting(false);
    setIsSubmitted(false);
  };

  useEffect(() => {
    if (isGameOver && score > 0) {
      sendScoreToSupabase(score);
    }
  }, [isGameOver, score, sendScoreToSupabase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      if (isGameOver) return;

      // --- TAMPILAN AWAL ---
      if (!gameStarted) {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FLAPPY BASED', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
        ctx.font = '18px sans-serif';
        ctx.fillText('Tap to Start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
        
        // Gambar burung di layar awal
        if (birdImageRef.current) {
          const birdX = GAME_WIDTH / 2 - BIRD_SIZE / 2;
          const birdY = GAME_HEIGHT / 2 - 100;
          ctx.drawImage(birdImageRef.current, birdX, birdY, BIRD_SIZE, BIRD_SIZE);
        }

        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // --- LOGIKA GAME ---
      const state = gameState.current;
      state.birdVelocity += GRAVITY;
      state.birdY += state.birdVelocity;

      if (timestamp - state.lastPipeSpawn > PIPE_SPAWN_RATE) {
        const minTop = 50; const maxTop = GAME_HEIGHT - GAP_SIZE - 150;
        const topHeight = Math.random() * (maxTop - minTop) + minTop;
        state.pipes.push({ x: GAME_WIDTH, topHeight, passed: false });
        state.lastPipeSpawn = timestamp;
      }

      state.pipes.forEach((pipe, index) => {
        pipe.x -= PIPE_SPEED;
        // Hitbox burung (sedikit lebih kecil dari gambarnya agar adil)
        const birdHitboxSize = BIRD_SIZE * 0.8;
        const birdX = 50 + (BIRD_SIZE - birdHitboxSize) / 2;
        const birdY = state.birdY + (BIRD_SIZE - birdHitboxSize) / 2;
        const pipeWidth = 52;

        const hitTop = birdX + birdHitboxSize > pipe.x && birdX < pipe.x + pipeWidth && birdY < pipe.topHeight;
        const hitBottom = birdX + birdHitboxSize > pipe.x && birdX < pipe.x + pipeWidth && birdY + birdHitboxSize > pipe.topHeight + GAP_SIZE;
        
        if (hitTop || hitBottom) setIsGameOver(true);
        if (!pipe.passed && birdX > pipe.x + pipeWidth) { setScore(p => p + 1); pipe.passed = true; }
        if (pipe.x + pipeWidth < -10) state.pipes.splice(index, 1);
      });

      if (state.birdY > GAME_HEIGHT - BIRD_SIZE || state.birdY < 0) setIsGameOver(true);

      // --- RENDERING ---
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Langit
      ctx.fillStyle = '#0047CC'; ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20); // Tanah

      // Pipa
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 2;
      state.pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, 52, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.topHeight + GAP_SIZE, 52, GAME_HEIGHT);
      });

      // Burung (Gambar)
      if (birdImageRef.current) {
        ctx.drawImage(birdImageRef.current, 50, state.birdY, BIRD_SIZE, BIRD_SIZE);
      } else {
        // Fallback jika gambar belum termuat
        ctx.fillStyle = '#FCD34D'; ctx.beginPath(); 
        ctx.arc(50 + BIRD_SIZE/2, state.birdY + BIRD_SIZE/2, BIRD_SIZE/2, 0, 2 * Math.PI); 
        ctx.fill();
      }

      // Skor
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
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0052FF] text-white p-4 overflow-hidden">

      {/* HEADER */}
      <div className="w-full max-w-[360px] flex flex-col items-center mb-4 z-10 px-2">
        <h1 className="text-3xl font-extrabold drop-shadow-md tracking-tight">
          Flappy Based
        </h1>
        {farcasterUser && (
          <p className="text-sm text-blue-100 mt-1 font-medium">
            Playing as: <span className="font-bold text-white">@{farcasterUser.username}</span>
          </p>
        )}
      </div>

      {/* AREA GAME */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#0052FF]" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onClick={jump}
          className="cursor-pointer block"
        />

        {/* OVERLAY GAME OVER */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 p-6 backdrop-blur-sm">
            <p className="text-4xl text-white font-extrabold mb-2 drop-shadow-lg">Game Over!</p>

            <div className="bg-white/10 p-4 rounded-xl mb-4 text-center shadow-lg border border-white/20 w-full max-w-[240px]">
              <p className="text-sm text-blue-200 uppercase tracking-wider font-bold">Your Score</p>
              <p className="text-6xl font-black text-white mt-1">{score}</p>
            </div>

            {/* Tombol Try Again */}
            <button
              onClick={resetGame}
              className="w-full max-w-[240px] mb-3 px-6 py-3 bg-white text-[#0052FF] hover:bg-blue-50 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-md"
            >
              Try Again
            </button>

            {/* Tombol Share Score (BARU!) */}
            <button
              onClick={shareScore}
              className="w-full max-w-[240px] mb-3 px-6 py-3 bg-[#0047CC] hover:bg-[#003DB3] rounded-xl text-white font-bold text-lg transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 border border-white/20"
            >
              <span>📤</span> Share Score
            </button>

            {/* Tombol Leaderboard */}
            <div className="w-full max-w-[240px]">
              <Link
                href="/leaderboard"
                className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md border border-white/20"
              >
                <span>🏆</span> Leaderboard
              </Link>
            </div>
            
            {/* Status Database */}
            <div className="mt-3 h-6 flex items-center justify-center font-medium text-sm">
              {isSubmitting && <p className="text-blue-200 flex items-center gap-2"><span className="animate-spin">⏳</span> Saving score...</p>}
              {isSubmitted && <p className="text-green-400 flex items-center gap-2">✅ Score saved!</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}