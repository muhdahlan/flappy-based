'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const APP_BASE_URL = 'https://flappy-based.vercel.app';

const GAME_WIDTH = 360;
const GAME_HEIGHT = 500;
const GRAVITY = 0.25;
const JUMP = -4.5;
const PIPE_SPEED = 2;
const PIPE_SPAWN_RATE = 1500;
const GAP_SIZE = 140;
const BIRD_SIZE = 40;

const BIRD_IMAGE_URL = 'https://imagedelivery.net/BXluQx4igeBGuW0Ia56BHw/f3975231-3886-426a-e152-67813b4a9200/rectcrop';

export default function FlappyBasedFinalUI() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdImageRef = useRef<HTMLImageElement | null>(null);
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

  useEffect(() => {
    const img = new Image();
    img.src = BIRD_IMAGE_URL;
    img.onload = () => {
      birdImageRef.current = img;
    };
  }, []);

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

  const shareScore = useCallback(() => {
    if (!farcasterUser) return;
    const text = `I just scored ${score} in Flappy Based! Can you beat my score? @${farcasterUser.username} #FlappyBased #Farcaster`;
    const embedUrl = `${APP_BASE_URL}/frame?score=${score}`;
    sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embedUrl)}`);
  }, [score, farcasterUser]);

  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;
        if (context?.user) {
          setFarcasterUser(context.user);
        }
      } catch (error) {
        console.error("Farcaster SDK initialization failed:", error);
      }
    };
    initFarcasterSDK();
  }, []);

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

      if (!gameStarted) {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FLAPPY BASED', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
        ctx.font = '18px sans-serif';
        ctx.fillText('Tap to Start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
        
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const state = gameState.current;
      state.birdVelocity += GRAVITY;
      state.birdY += state.birdVelocity;

      if (timestamp - state.lastPipeSpawn > PIPE_SPAWN_RATE) {
        const minTop = 50;
        const maxTop = GAME_HEIGHT - GAP_SIZE - 60;
        const topHeight = Math.random() * (maxTop - minTop) + minTop;
        state.pipes.push({ x: GAME_WIDTH, topHeight, passed: false });
        state.lastPipeSpawn = timestamp;
      }

      state.pipes.forEach((pipe, index) => {
        pipe.x -= PIPE_SPEED;
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

      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#0052FF'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#0047CC'; ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);

      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 2;
      state.pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, 52, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.topHeight + GAP_SIZE, 52, GAME_HEIGHT);
      });

      if (birdImageRef.current) {
        ctx.drawImage(birdImageRef.current, 50, state.birdY, BIRD_SIZE, BIRD_SIZE);
      } else {
        ctx.fillStyle = '#FCD34D'; ctx.beginPath();
        ctx.arc(50 + BIRD_SIZE/2, state.birdY + BIRD_SIZE/2, BIRD_SIZE/2, 0, 2 * Math.PI);
        ctx.fill();
      }

      if (gameStarted && !isGameOver) {
        ctx.fillStyle = 'white'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(score.toString(), GAME_WIDTH / 2, 80);
      }

      if (!isGameOver) animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isGameOver, gameStarted, score, farcasterUser]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0052FF] text-white p-4 overflow-hidden">
      <div className="w-full max-w-[360px] flex flex-col items-center mb-4 z-10 px-2">
        <h1 className="text-3xl font-extrabold drop-shadow-md tracking-tight">Flappy Based</h1>
        {farcasterUser && (
          <p className="text-sm text-blue-100 mt-1 font-medium">
            Playing as: <span className="font-bold text-white">@{farcasterUser.username}</span>
          </p>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#0052FF]" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onClick={jump}
          className="cursor-pointer block"
        />

        {isGameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 p-6 backdrop-blur-sm">
            <p className="text-4xl text-white font-extrabold mb-2 drop-shadow-lg">Game Over!</p>
            <div className="bg-white/10 p-4 rounded-xl mb-4 text-center shadow-lg border border-white/20 w-full max-w-[240px]">
              <p className="text-sm text-blue-200 uppercase tracking-wider font-bold">Your Score</p>
              <p className="text-6xl font-black text-white mt-1">{score}</p>
            </div>
            <button onClick={resetGame} className="w-full max-w-[240px] mb-3 px-6 py-3 bg-white text-[#0052FF] hover:bg-blue-50 rounded-xl font-bold text-lg">Try Again</button>
            <button onClick={shareScore} className="w-full max-w-[240px] mb-3 px-6 py-3 bg-[#0047CC] hover:bg-[#003DB3] rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 border border-white/20"><span>📤</span> Share Score</button>
            <div className="w-full max-w-[240px]">
              <Link href="/leaderboard" className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold flex items-center justify-center gap-2 border border-white/20"><span>🏆</span> Leaderboard</Link>
            </div>
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