import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    "frame": {
      "name": "Flappy Based",
      "version": "1",
      "iconUrl": "https://flappy-based.vercel.app/icon.png",
      "homeUrl": "https://flappy-based.vercel.app",
      "imageUrl": "https://flappy-based.vercel.app/image.png",
      "buttonTitle": "Play Flappy Based 🐦",
      "splashImageUrl": "https://flappy-based.vercel.app/splash.png",
      "splashBackgroundColor": "#0052FF",
      "webhookUrl": "https://flappy-based.vercel.app/api/webhook",
      "subtitle": "Fly high and dominate the real-time leaderboard!",
      "description": "Classic Flappy game built for Farcaster with live rankings on Base",
      "primaryCategory": "games",
      "tags": [
        "flappy",
        "game",
        "arcade",
        "bird"
      ]
    },
    "accountAssociation": {
      "header": "eyJmaWQiOjI0Mjg0NywidHlwZSI6ImF1dGgiLCJrZXkiOiIweGJiMjVjQzVkNWJjNjE4MzA5NGQ2OTM4ZUZiMEZlYmQyMEQ3NGRCYUEifQ",
      "payload": "eyJkb21haW4iOiJmbGFwcHktYmFzZWQudmVyY2VsLmFwcCJ9",
      "signature": "ecUane4BUXCeCaWjilLNNdIe8gCVRaB9LsmDqgEKb0c2CPn+xlfqZ733/aKyc5uEj8KSep27t2iIg7aS5dStpBs="
    }
  };

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
    },
  });
}