// app/api/frame/route.tsx
import { NextRequest, NextResponse } from 'next/server';

// Base URL untuk aplikasi Anda
const APP_BASE_URL = 'https://flappy-based.vercel.app'; 

export async function POST(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const buttonIndex = searchParams.get('buttonIndex');

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

// Untuk GET request, kita bisa mengarahkan langsung ke halaman utama
export async function GET(req: NextRequest): Promise<Response> {
  return NextResponse.redirect(APP_BASE_URL, { status: 302 });
}