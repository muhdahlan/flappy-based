// app/api/frame/route.tsx
import { NextRequest, NextResponse } from 'next/server';

// Base URL aplikasi Anda
const APP_BASE_URL = 'https://flappy-based.vercel.app'; 

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url); // Mengambil URL dari request
  const buttonIndex = url.searchParams.get('buttonIndex'); // Ini dari fc:frame:post_url?buttonIndex=X

  let redirectUrl = APP_BASE_URL; // Default redirect ke halaman utama

  // Logika redirect berdasarkan tombol yang ditekan
  if (buttonIndex === '1') { // Tombol "Play Again"
    redirectUrl = APP_BASE_URL;
  } else if (buttonIndex === '2') { // Tombol "Leaderboard"
    redirectUrl = `${APP_BASE_URL}/leaderboard`;
  }

  // Merespons dengan pengalihan
  return NextResponse.redirect(redirectUrl, { status: 302 });
}

// Untuk GET request ke /api/frame, kita juga redirect ke halaman utama
export async function GET(req: NextRequest): Promise<Response> {
  return NextResponse.redirect(APP_BASE_URL, { status: 302 });
}