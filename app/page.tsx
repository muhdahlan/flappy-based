'use client';

import { useEffect, useState, useCallback } from 'react';
import farcaster from '@farcaster/miniapp-sdk';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

// --- KONFIGURASI GAME ---
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const GRAVITY = 3; // Gravitasi disesuaikan untuk versi non-canvas
const JUMP = -50; // Kekuatan lompat disesuaikan
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 2000;
const BIRD_SIZE = 40; // Ukuran gambar burung
const GAP_SIZE = 150;

// URL Gambar Burung (Logo Mini App Anda)
const BIRD_IMAGE_URL = 'https://imagedelivery.net/BXluQx4igeBGuW0Ia56BHw/f3975231-3886-426a-e152-67813b4a9200/rectcrop';

export default function FlappyBasedPage() {
  // --- STATE APLIKASI & USER ---
  const [farcasterUser, setFarcasterUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // --- STATE GAME ---
  const [gameStarted, setGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [birdPosition, setBirdPosition] = useState(GAME_HEIGHT / 2);
  const [pipes, setPipes] = useState<{ x: number; topHeight: number; passed: boolean }[]>([]);

  // --- INISIALISASI FARCASTER ---
  useEffect(() => {
    const init = async () => {
      try {
        await farcaster.actions.ready();
        const ctx = await farcaster.context;
        if (ctx?.user) setFarcasterUser(ctx.user);
      } catch (e) {
        console.error('Farcaster init error:', e);
      }
    };
    init();
  }, []);

  // --- FUNGSI DATABASE ---
  const sendScoreToSupabase = useCallback(async (finalScore: number) => {
    if (!farcasterUser || finalScore <= 0 || isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('scores').insert({
      username: farcasterUser.username,
      score: finalScore,
      fid: farcasterUser.fid,
    });
    setIsSubmitting(false);
    if (!error) setIsSubmitted(true);
  }, [farcasterUser, isSubmitting, isSubmitted]);

  useEffect(() => {
    if (isGameOver && score > 0) sendScoreToSupabase(score);
  }, [isGameOver, score, sendScoreToSupabase]);

  // --- LOGIKA GAME LOOP ---
  useEffect(() => {
    let gameLoop: NodeJS.Timeout;
    let pipeGenerator: NodeJS.Timeout;

    if (gameStarted && !isGameOver) {
      // Loop utama untuk fisika dan pergerakan
      gameLoop = setInterval(() => {
        setBirdPosition((pos) => {
          const newPos = pos + GRAVITY;
          // Cek tabrakan dengan tanah atau langit
          if (newPos > GAME_HEIGHT - BIRD_SIZE || newPos < 0) {
            setIsGameOver(true);
          }
          return newPos;
        });

        setPipes((currentPipes) => {
          const newPipes = currentPipes
            .map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
            .filter((pipe) => pipe.x > -60);

          newPipes.forEach((pipe) => {
            // Logika Tabrakan
            const birdLeft = 50;
            const birdRight = 50 + BIRD_SIZE;
            const birdTop = birdPosition;
            const birdBottom = birdPosition + BIRD_SIZE;

            if (birdRight > pipe.x && birdLeft < pipe.x + 52) {
              if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + GAP_SIZE) {
                setIsGameOver(true);
              }
            }
            // Logika Skor
            if (!pipe.passed && birdLeft > pipe.x + 52) {
              setScore((s) => s + 1);
              pipe.passed = true;
            }
          });
          return newPipes;
        });
      }, 24); // Sekitar 45 FPS

      // Generator Pipa
      pipeGenerator = setInterval(() => {
        const minTop = 50;
        const maxTop = GAME_HEIGHT - GAP_SIZE - 100;
        const topHeight = Math.random() * (maxTop - minTop) + minTop;
        setPipes((pipes) => [...pipes, { x: GAME_WIDTH, topHeight, passed: false }]);
      }, PIPE_SPAWN_RATE);
    }

    return () => {
      clearInterval(gameLoop);
      clearInterval(pipeGenerator);
    };
  }, [gameStarted, isGameOver, birdPosition]);

  // --- KONTROL GAME ---
  const jump = () => {
    if (!gameStarted) setGameStarted(true);
    if (!isGameOver) setBirdPosition((pos) => Math.max(0, pos + JUMP));
  };

  const resetGame = () => {
    setGameStarted(false);
    setIsGameOver(false);
    setScore(0);
    setBirdPosition(GAME_HEIGHT / 2);
    setPipes([]);
    setIsSubmitted(false);
  };

  // --- TAMPILAN (UI) ---
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0052FF] overflow-hidden">
      {/* Header */}
      <div className="z-10 mb-4 text-center text-white">
        <h1 className="text-3xl font-extrabold drop-shadow-md">Flappy Based</h1>
        {farcasterUser && <p className="font-medium">Playing as: <span className="font-bold">@{farcasterUser.username}</span></p>}
      </div>

      {/* Container Game */}
      <div
        className="relative bg-[#4EC0CA] overflow-hidden shadow-2xl rounded-2xl cursor-pointer"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onClick={jump}
      >
        {/* Layar Start */}
        {!gameStarted && !isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
            <Image src={BIRD_IMAGE_URL} alt="Start Bird" width={60} height={60} className="mb-4 animate-bounce" />
            <p className="text-2xl font-bold mb-2">FLAPPY BASED</p>
            <p className="text-lg animate-pulse">Tap to Start</p>
          </div>
        )}

        {/* Skor saat main */}
        {gameStarted && !isGameOver && (
          <p className="absolute top-10 left-0 right-0 text-center text-5xl font-bold text-white drop-shadow-md z-20">{score}</p>
        )}

        {/* Pipa-pipa */}
        {pipes.map((pipe, i) => (
          <div key={i}>
            {/* Pipa Atas */}
            <div className="absolute bg-green-500 border-2 border-green-700" style={{ left: pipe.x, top: 0, width: 52, height: pipe.topHeight }} />
            {/* Pipa Bawah */}
            <div className="absolute bg-green-500 border-2 border-green-700 bottom-0" style={{ left: pipe.x, width: 52, height: GAME_HEIGHT - pipe.topHeight - GAP_SIZE }} />
          </div>
        ))}

        {/* KARAKTER BURUNG (Bukan bola lagi!) */}
        <div
          className="absolute transition-all duration-75 ease-out"
          style={{
            left: 50,
            top: birdPosition,
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            // Rotasi sedikit saat melompat/jatuh agar lebih dinamis
            transform: `rotate(${Math.min(Math.max((birdPosition - (GAME_HEIGHT/2)) / 10, -30), 90)}deg)`
          }}
        >
           <Image 
             src={BIRD_IMAGE_URL}
             alt="Bird Character"
             fill
             style={{ objectFit: 'contain' }}
             priority
           />
        </div>

        {/* Tanah */}
        <div className="absolute bottom-0 w-full h-4 bg-[#DEDEDE] border-t-4 border-[#553C2A] z-10"></div>

        {/* Layar Game Over */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 text-white">
            <p className="text-4xl font-extrabold mb-4">Game Over!</p>
            <div className="bg-white/10 p-4 rounded-xl mb-6 text-center">
              <p className="text-sm uppercase font-bold text-blue-200">Score</p>
              <p className="text-6xl font-black">{score}</p>
            </div>
            <button onClick={resetGame} className="bg-white text-[#0052FF] px-8 py-3 rounded-xl font-bold text-xl mb-4 hover:scale-105 transition">Try Again</button>
            <Link href="/leaderboard" className="bg-[#0047CC] px-8 py-3 rounded-xl font-bold text-xl hover:scale-105 transition">🏆 Leaderboard</Link>
            <div className="mt-4 h-6 text-sm font-medium">
              {isSubmitting && <span className="text-blue-200 animate-pulse">⏳ Saving score...</span>}
              {isSubmitted && <span className="text-green-400">✅ Score saved!</span>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}