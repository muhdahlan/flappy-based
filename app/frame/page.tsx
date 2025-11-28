// app/frame/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Base URL untuk aplikasi Anda (PASTIKAN INI URL DEPLOYMENT VERSEL ANDA)
const APP_BASE_URL = 'https://flappy-based.vercel.app'; 

// Fungsi untuk menghasilkan metadata Frame
export async function generateMetadata(): Promise<Metadata> {
  // Ambil query parameter 'score' dari URL
  // Contoh URL: https://flappy-based.vercel.app/frame?score=123
  const scoreParam = new URLSearchParams().get('score');
  const score = scoreParam ? parseInt(scoreParam) : null;

  // URL gambar yang akan ditampilkan di Frame
  // Untuk sementara kita pakai gambar placeholder
  // Nanti bisa dibuat dinamis sesuai skor
  const frameImage = `${APP_BASE_URL}/api/og?score=${score}`; // Kita akan buat API ini nanti
  const framePostUrl = `${APP_BASE_URL}/api/frame`; // URL untuk handle interaksi tombol Frame (akan dibuat nanti)

  return {
    title: 'Flappy Based - Score Share',
    description: `I just scored ${score !== null ? score : 'a new highscore'} in Flappy Based!`,
    openGraph: {
      title: 'Flappy Based',
      description: `I just scored ${score !== null ? score : 'a new highscore'} in Flappy Based!`,
      images: [
        {
          url: frameImage,
          width: 1200,
          height: 630,
          alt: `My score in Flappy Based is ${score !== null ? score : 'a new highscore'}`,
        },
      ],
    },
    other: {
      // METADATA FARCASTER FRAME
      'fc:frame': 'vNext',
      'fc:frame:image': frameImage,
      'fc:frame:post_url': framePostUrl,
      'fc:frame:button:1': 'Play Again',
      'fc:frame:button:1:action': 'post_redirect', // Redirect ke game utama
      'fc:frame:button:2': 'Leaderboard',
      'fc:frame:button:2:action': 'post_redirect', // Redirect ke leaderboard
    },
  };
}

// Komponen halaman Frame
// Ini sebenarnya tidak akan terlihat di browser, hanya metadata yang penting
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