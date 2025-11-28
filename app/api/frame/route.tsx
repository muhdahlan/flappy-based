import { NextRequest, NextResponse } from 'next/server';

const APP_URL = 'https://flappy-based.vercel.app'; 

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json();
  const { untrustedData } = body;
  const { buttonIndex } = untrustedData;

  if (buttonIndex === 1) {
    return NextResponse.redirect(`${APP_URL}`, { status: 302 });
  } else if (buttonIndex === 2) {
    return NextResponse.redirect(`${APP_URL}/leaderboard`, { status: 302 });
  } else {
    return NextResponse.redirect(`${APP_URL}`, { status: 302 });
  }
}