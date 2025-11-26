import { NextResponse } from 'next/server';

// ==========================================
// KONFIGURASI KUNCI RAHASIA
// ==========================================
// API Key Neynar Anda (Sudah saya masukkan berdasarkan info Anda)
const FARCASTER_HUB_API_KEY = '8076C074-CE48-4866-8389-43177E043B11';

// GANTI DENGAN WEBHOOK SECRET YANG SAMA PERSIS DENGAN DI farcaster-domain.json DAN app/page.tsx
const WEBHOOK_SECRET = 'zfcshqAgvcrHSfgmueYPNLjeaeK430nKSZLxtJYP9Ks=';

// ==========================================
// HANDLER UNTUK PERMINTAAN POST
// ==========================================
// Fungsi ini yang akan dijalankan saat ada permintaan POST ke /api/notifications
export async function POST(request: Request) {
  try {
    // 1. VERIFIKASI KEAMANAN (Sangat Penting!)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.warn('Percobaan akses notifikasi ditolak: Secret tidak cocok.');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. BACA DATA PERMINTAAN
    const body = await request.json();
    const { recipientFid, title, body: notificationBody, url } = body;

    // Validasi data
    if (!recipientFid || !title || !notificationBody) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    console.log(`Mengirim notifikasi ke FID ${recipientFid}...`);

    // 3. KIRIM NOTIFIKASI KE API FARCASTER (Menggunakan Neynar)
    const farcasterApiResponse = await fetch('https://api.neynar.com/v2/farcaster/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': FARCASTER_HUB_API_KEY,
        'accept': 'application/json',
      },
      body: JSON.stringify({
        recipient_fid: recipientFid,
        title: title,
        body: notificationBody,
        url: url || 'https://flappy-based.vercel.app',
      }),
    });

    if (!farcasterApiResponse.ok) {
      const errorData = await farcasterApiResponse.json();
      console.error('Gagal mengirim notifikasi ke Farcaster:', errorData);
      return new NextResponse(JSON.stringify(errorData), {
        status: farcasterApiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await farcasterApiResponse.json();
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error internal server:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}