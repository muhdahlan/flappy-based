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
      const state