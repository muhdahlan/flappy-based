import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const score = searchParams.get('score') || '0';
  const userAgent = req.headers.get('user-agent') || 'Unknown User-Agent';

  console.log(`DEBUG: /api/og diakses. Score: ${score}, User-Agent: ${userAgent}`);

  return new NextResponse(`Halo dari API OG. Skornya adalah ${score}. User-Agent: ${userAgent}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}