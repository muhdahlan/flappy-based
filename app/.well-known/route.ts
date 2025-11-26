import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Fungsi ini menangani permintaan GET ke /.well-known/farcaster.json
export async function GET() {
  try {
    // Cari lokasi file farcaster-domain.json di root proyek
    const filePath = path.join(process.cwd(), 'farcaster-domain.json');
    
    // Baca isi filenya
    const fileContents = fs.readFileSync(filePath, 'utf8');
    
    // Parse menjadi JSON objek agar yakin formatnya benar
    const manifest = JSON.parse(fileContents);

    // Kirim respons JSON dengan header caching agar efisien
    return new NextResponse(JSON.stringify(manifest), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache di CDN dan browser selama 1 jam, gunakan data lama hingga 1 hari jika terjadi error
        'Cache-Control': 'public, s-maxage=3600, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Gagal membaca domain manifest:', error);
    // Jika file tidak ada atau error lain, kirim status 500
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}