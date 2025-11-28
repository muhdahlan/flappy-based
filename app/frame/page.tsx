// app/frame/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Request } from 'next/dist/compiled/@vercel/og/lib/types'; // Import Request dari next

// Base URL untuk aplikasi Anda - PASTIKAN INI URL DOMAIN VERSEL ANDA
const APP_BASE_URL = 'https://flappy-based.vercel.app'; 

// Fungsi untuk menghasilkan metadata Frame
// PERHATIKAN: Menambahkan parameter 'req' untuk mendapatkan URL request yang sebenarnya
export async function generateMetadata({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }): Promise<Metadata> {
  // Ambil query parameter 'score' dari URL request saat ini
  // Next.js secara otomatis menyediakan searchParams di generateMetadata
  const scoreParam = searchParams.score;
  const score = typeof scoreParam === 'string' ? parseInt(scoreParam, 10) : null;

  // URL gambar yang akan ditampilkan di Frame
  // Ini akan memanggil API Route kita untuk membuat gambar dinamis
  const frameImage = `${APP_BASE_URL}/api/og?score=${score}`;
  // URL untuk menangani interaksi tombol Frame (saat tombol diklik)
  const framePostUrl = `${APP_BASE_URL}/api/frame`;

  return {
    title: 'Flappy Based - Score Share',
    description: `I just scored ${score !== null ? score : 'a new highscore'} in Flappy Based!`,
    openGraph: {
      title: 'Flappy Based',
      description: `I just scored ${score !== null ? score : 'a new highscore'} in Flappy Based!`,
      images: [
        {
          url: frameImage,
          width: 1200, // Ukuran standar untuk Open Graph / Frame image
          height: 630,
          alt: `My score in Flappy Based is ${score !== null ? score : 'a new highscore'}`,
        },
      ],
    },
    other: {
      // METADATA FARCASTER FRAME (fc:frame)
      'fc:frame': 'vNext',
      'fc:frame:image': frameImage,
      'fc:frame:post_url': framePostUrl,
      'fc:frame:button:1': 'Play Again',
      'fc:frame:button:1:action': 'post_redirect', // Mengarahkan ke game utama
      'fc:frame:button:2': 'Leaderboard',
      'fc:frame:button:2:action': 'post_redirect', // Mengarahkan ke leaderboard
    },
  };
}

// Komponen halaman Frame
// Ini adalah halaman kosong yang hanya berguna untuk metadata
export default function FramePage() {
  return (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: '#0052FF', 
        color: 'white', 
        fontSize: '24px',
        textAlign: 'center'
    }}>
      <h1>Flappy Based Score Share</h1>
      <p>This page is for Farcaster Frame embeds only.</p>
      <p>Go to the <a href={APP_BASE_URL} style={{ color: 'yellow' }}>main app</a> to play!</p>
    </div>
  );
}