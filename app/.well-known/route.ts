import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'farcaster-domain.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const manifest = JSON.parse(fileContents);

    return new NextResponse(JSON.stringify(manifest), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Failed to read domain manifest:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}