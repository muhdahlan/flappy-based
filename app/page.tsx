'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import farcaster from '@farcaster/miniapp-sdk';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ==========================================
// KONFIGURASI GAME
// ==========================================
// Ini adalah resolusi internal kanvas (untuk logika game)
const GAME_WIDTH_INTERNAL = 360;
const GAME_HEIGHT_INTERNAL = 640;

// Konstanta Fisika & Gameplay (Disesuaikan dengan resolusi internal)
const GRAVITY = 0.25;
const JUMP_STRENGTH = -4.5;
const PIPE_SPEED = 2;
const PIPE_SPAWN_RATE = 1500;
const GAP_SIZE = 140;
const BIRD_SIZE = 40; // Ukuran burung dalam piksel internal
const PIPE_WIDTH = 52;

// URL Gambar Burung (URL BARU DARI POSTIMAGE)
const BIRD_IMAGE_URL = 'https://i.postimg.cc/fSky0tZw/449629522-122153685344220908-2606213258427399354-n.png';

// Tipe data pipa
interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export default function FlappyBasedPage() {
  // --- STATE & REFS (UI & LOGIKA) ---
  const birdImageRef = useRef<HTMLImageElement | null>(null);
  // State dummy untuk memicu re-render saat gambar siap
  const [, setForceRender] = useState(false);
  
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // --- REFS UNTUK GAME LOOP (CANVAS) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // State game yang berubah cepat disimpan di ref untuk performa (ANTI-LAG)
  const gameStateRef = useRef({
    birdY: GAME_HEIGHT_INTERNAL / 2,
    birdVelocity: 0,
    pipes: [] as Pipe[],
    lastPipeSpawnTime: 0,
    score: 0,
  });
  const requestRef = useRef<number>();

  // ==========================================
  // BAGIAN 1: INISIALISASI & DATABASE
  // ==========================================

  // Memuat Gambar Burung
  useEffect(() => {
    const img = new Image();
    img.src = BIRD_IMAGE_URL;
    img.onload = () => {
      birdImageRef.current = img;
      setForceRender(prev => !prev); // Picu re-render agar tampilan awal muncul
    };
  }, []);

  // Inisialisasi Farcaster
  useEffect(() => {
    const init = async () => {
      try {
        await farcaster.actions.ready();
        const ctx = await farcaster.context;
        if (ctx?.user) setFarcasterUser(ctx.user);
      } catch (e) console.error(e);
    };
    init();
  }, []);

  // Fungsi Kirim Skor
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

  // Kirim skor saat game over
  useEffect(() => {
    if (isGameOver && score > 0) sendScoreToSupabase(score);
  }, [isGameOver, score, sendScoreToSupabase]);


  // ==========================================
  // BAGIAN 2: LOGIKA GAME LOOP (CANVAS)
  // ==========================================

  const jump = () => {
    if (isGameOver) return;
    if (!gameStarted) setGameStarted(true);
    gameStateRef.current.birdVelocity = JUMP_STRENGTH;
  };

  const gameLoop = (time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (isGameOver || !canvas || !ctx) return;

    const state = gameStateRef.current;

    // --- UPDATE FISIKA ---
    if (gameStarted) {
      state.birdVelocity += GRAVITY;
      state.birdY += state.birdVelocity;

      // Cek Tabrakan Tanah/Langit
      if (state.birdY + BIRD_SIZE >= GAME_HEIGHT_INTERNAL - 20 || state.birdY <= 0) {
        setIsGameOver(true);
        setScore(state.score);
      }

      // Spawn Pipa
      if (time - state.lastPipeSpawnTime > PIPE_SPAWN_RATE) {
        const minTop = 50;
        const maxTop = GAME_HEIGHT_INTERNAL - GAP_SIZE - 150; 
        const topHeight = Math.random() * (maxTop - minTop) + minTop;
        state.pipes.push({ x: GAME_WIDTH_INTERNAL, topHeight, passed: false });
        state.lastPipeSpawnTime = time;
      }

      // Update Pipa & Cek Tabrakan
      state.pipes.forEach((pipe, index) => {
        pipe.x -= PIPE_SPEED;
        
        const birdHitbox = BIRD_SIZE * 0.8;
        const birdX = 50 + (BIRD_SIZE - birdHitbox) / 2;
        const birdY = state.birdY + (BIRD_SIZE - birdHitbox) / 2;
        const pipeRight = pipe.x + PIPE_WIDTH;

        // AABB Collision
        if (birdX + birdHitbox > pipe.x && birdX < pipeRight) {
            if (birdY < pipe.topHeight || birdY + birdHitbox > pipe.topHeight + GAP_SIZE) {
                setIsGameOver(true);
                setScore(state.score);
            }
        }

        // Update Skor
        if (!pipe.passed && birdX > pipeRight) {
          state.score += 1;
          pipe.passed = true;
          setScore(state.score);
        }

        // Hapus pipa lewat
        if (pipe.x + PIPE_WIDTH < -50) state.pipes.splice(index, 1);
      });
    }

    // --- RENDER CANVAS ---
    ctx.clearRect(0, 0, GAME_WIDTH_INTERNAL, GAME_HEIGHT_INTERNAL);
    ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 0, GAME_WIDTH_INTERNAL, GAME_HEIGHT_INTERNAL); // Langit
    
    // Pipa
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 2;
    state.pipes.forEach((pipe) => {
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.topHeight + GAP_SIZE, PIPE_WIDTH, GAME_HEIGHT_INTERNAL - (pipe.topHeight + GAP_SIZE));
        ctx.strokeRect(pipe.x, pipe.topHeight + GAP_SIZE, PIPE_WIDTH, GAME_HEIGHT_INTERNAL - (pipe.topHeight + GAP_SIZE));
    });

     ctx.fillStyle = '#0047CC'; ctx.fillRect(0, GAME_HEIGHT_INTERNAL - 20, GAME_WIDTH_INTERNAL, 20); // Tanah

    // GAMBAR BURUNG (Pakai gambar yang sudah di-load)
    if (birdImageRef.current) {
      // Posisi X tetap di 50
      ctx.drawImage(birdImageRef.current, 50, state.birdY, BIRD_SIZE, BIRD_SIZE);
    } else {
      // Fallback bola kuning
      ctx.fillStyle = '#FCD34D'; ctx.beginPath();
      ctx.arc(50 + BIRD_SIZE/2, state.birdY + BIRD_SIZE/2, BIRD_SIZE/2, 0, 2 * Math.PI);
      ctx.fill();
    }

    if (!isGameOver) requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Kontrol Loop Utama
  useEffect(() => {
    if (!isGameOver) requestRef.current = requestAnimationFrame(gameLoop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isGameOver]);

  // Reset Game State
  const resetGame = () => {
    setGameStarted(false);
    setIsGameOver(false);
    setScore(0);
    setIsSubmitted(false);
    // Reset ref
    gameStateRef.current = {
      birdY: GAME_HEIGHT_INTERNAL / 2, birdVelocity: 0, pipes: [], lastPipeSpawnTime: 0, score: 0,
    };
  };


  // ==========================================
  // BAGIAN 3: TAMPILAN UTAMA (JSX)
  // ==========================================
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0052FF] text-white p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-[360px] flex flex-col items-center mb-4 z-10 px-2">
        <h1 className="text-3xl font-extrabold drop-shadow-md tracking-tight">Flappy Based</h1>
        {farcasterUser && <p className="text-sm mt-1 font-medium">Playing as: <span className="font-bold">@{farcasterUser.username}</span></p>}
      </div>

      {/* Container Game (Lebar Responsif, Tinggi Tetap) */}
      <div 
        className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#0052FF] w-full max-w-[360px]"
        // Tinggi container diatur menggunakan CSS aspect-ratio agar responsif namun tetap proporsional
        style={{ aspectRatio: `${GAME_WIDTH_INTERNAL} / ${GAME_HEIGHT_INTERNAL}` }}
      >
        
        {/* KANVAS GAME (LAYER PALING BAWAH) */}
        <canvas
            ref={canvasRef}
            // Atribut width dan height ini adalah resolusi internal kanvas (360x640)
            width={GAME_WIDTH_INTERNAL}
            height={GAME_HEIGHT_INTERNAL}
            onClick={jump}
            // Class CSS 'w-full h-full' akan membuat kanvas meregang memenuhi container
            className="cursor-pointer block absolute inset-0 w-full h-full"
            style={{ touchAction: 'none' }}
        />
        
        {/* TAMPILAN AWAL (OVERLAY) */}
        {!gameStarted && !isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            <p className="text-2xl font-bold mb-4">FLAPPY BASED</p>
            {birdImageRef.current && (
              // Gambar di layar awal juga dibuat responsif
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={BIRD_IMAGE_URL} 
                alt="Bird" 
                // Ukuran tampilan diatur dengan CSS, bukan atribut width/height
                className="mb-8 animate-bounce w-[20%] h-auto" 
              />
            )}
            <p className="text-lg animate-pulse">Tap to Start</p>
          </div>
        )}

        {/* SKOR SAAT BERMAIN (OVERLAY) */}
        {gameStarted && !isGameOver && (
          <div className="absolute top-4 left-0 right-0 text-center z-20 pointer-events-none">
             <p className="text-5xl font-bold drop-shadow-md">{score}</p>
          </div>
        )}

        {/* OVERLAY GAME OVER */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 p-6 backdrop-blur-sm">
            <p className="text-4xl text-white font-extrabold mb-2 drop-shadow-lg">Game Over!</p>
            <div className="bg-white/10 p-4 rounded-xl mb-4 text-center shadow-lg border border-white/20 w-full max-w-[240px]">
              <p className="text-sm uppercase font-bold text-blue-200">Your Score</p>
              <p className="text-6xl font-black text-white mt-1">{score}</p>
            </div>
            <button onClick={resetGame} className="w-full max-w-[240px] mb-3 px-6 py-3 bg-white text-[#0052FF] hover:bg-blue-50 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-md">Try Again</button>
            <Link href="/leaderboard" className="w-full max-w-[240px] px-6 py-3 bg-[#0047CC] hover:bg-[#003DB3] rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md border border-white/20">
              <span>🏆</span> Leaderboard
            </Link>
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