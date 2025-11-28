// app/api/og/route.tsx
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// export const runtime = 'edge'; //

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const score = searchParams.get('score') || '0';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#0052FF',
            color: 'white',
            fontFamily: 'sans-serif',
            fontSize: 60,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>My Flappy Based Score:</div>
          <div style={{ fontSize: 120, fontWeight: 'bold' }}>{score}</div>
          <div style={{ fontSize: 30, marginTop: 20 }}>Tap to play!</div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.log(`Error generating OG image: ${e.message}`);
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}