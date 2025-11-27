import { Metadata } from 'next';

// ==========================================
// KONFIGURASI FRAME
// ==========================================

// URL GAMBAR HERO (Poster Lebar) - INI SUDAH DIPERBARUI
const HERO_IMAGE_URL = 'https://i.postimg.cc/mgBKM44r/splash.png'; 

// URL Root aplikasi Anda (tempat game berada)
// Pastikan ini mengarah ke domain Vercel Anda yang benar
const GAME_URL = 'https://flappy-based.vercel.app';


export const metadata: Metadata = {
  title: 'Flappy Based',
  description: 'Fly high, dodge pipes, and dominate the real-time leaderboard!',
  openGraph: {
    title: 'Flappy Based',
    description: 'Fly high, dodge pipes, and dominate the real-time leaderboard!',
    images: [HERO_IMAGE_URL],
  },
  other: {
    // --- META TAGS KHUSUS FARCASTER FRAME ---
    'fc:frame': 'vNext',
    'fc:frame:image': HERO_IMAGE_URL,
    // Aspek rasio 1.91:1 agar gambar terlihat lebar dan penuh
    'fc:frame:image:aspect_ratio': '1.91:1', 
    
    // Tombol 1: "Play Now"
    'fc:frame:button:1': 'Play Now 🚀',
    // Aksi 'link' akan membuka Mini App saat diklik
    'fc:frame:button:1:action': 'link',
    // Target link adalah URL game utama Anda
    'fc:frame:button:1:target': GAME_URL,
  },
};

// Halaman statis sederhana sebagai fallback
export default function FramePage() {
  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Flappy Based</h1>
      <img src={HERO_IMAGE_URL} alt="Flappy Based Hero" style={{ maxWidth: '100%', borderRadius: 8 }} />
      <p>Head over to Warpcast to interact with this frame!</p>
      <a href={GAME_URL} style={{ display: 'inline-block', marginTop: 10, padding: '10px 20px', backgroundColor: '#0052FF', color: 'white', textDecoration: 'none', borderRadius: 5 }}>
        Play the game directly
      </a>
    </div>
  );
}