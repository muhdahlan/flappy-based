import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startOfDay } from 'date-fns';

// --- KONFIGURASI ---
// GANTI DENGAN API KEY NEYNAR ANDA YANG SEBENARNYA
const FARCASTER_HUB_API_KEY = '8076C074-CE48-4866-8389-43177E043B11'; 
const BATCH_SIZE = 20; // Jumlah user per batch

// Inisialisasi Supabase Admin Client (Butuh SUPABASE_SERVICE_ROLE_KEY di Vercel Env Vars)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(request: Request) {
  // Verifikasi Cron Secret dari Vercel
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Uncomment baris ini untuk produksi agar aman
    // return new NextResponse('Unauthorized', { status: 401 });
    console.warn('Warning: Unauthorized access attempt or manual trigger without secret.');
  }

  try {
    console.log('Starting hourly notification batch job...');
    const todayStart = startOfDay(new Date()).toISOString();

    // 1. Dapatkan kandidat dari database (RPC)
    const { data: candidates, error: candidateError } = await supabaseAdmin.rpc('get_notification_candidates', {
      check_date: todayStart,
      batch_limit: BATCH_SIZE
    });

    if (candidateError) throw candidateError;

    if (!candidates || candidates.length === 0) {
      console.log('No notification candidates found for this batch.');
      return new NextResponse(JSON.stringify({ message: 'No candidates for this batch', processed: 0 }), { status: 200 });
    }

    console.log(`Found ${candidates.length} candidates for this batch. Sending notifications...`);

    // 2. Pesan notifikasi
    const title = "Daily Flappy Reminder 🐦";
    const body = "Haven't played Flappy Based today? Tap to set a new high score!";
    const url = 'https://flappy-based.vercel.app';

    // 3. Kirim & catat log
    const results = await Promise.all(candidates.map(async (user: any) => {
      const fid = user.fid;
      let status = 'failed';

      try {
        const response = await fetch('https://api.neynar.com/v2/farcaster/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key': FARCASTER_HUB_API_KEY,
            'accept': 'application/json',
          },
          body: JSON.stringify({ recipient_fid: fid, title, body, url }),
        });

        if (response.ok) status = 'sent';
        else if (response.status === 400 || response.status === 403) status = 'opted_out';
        else console.error(`Neynar error for FID ${fid}:`, await response.json());

      } catch (err) {
        console.error(`Error sending to FID ${fid}:`, err);
        status = 'error';
      }

      // Catat ke database
      await supabaseAdmin
        .from('daily_notification_log')
        .upsert({ fid, last_sent_at: new Date().toISOString(), status }, { onConflict: 'fid' });

      return { fid, status };
    }));

    const sentCount = results.filter(r => r.status === 'sent').length;
    console.log(`Batch finished. Sent: ${sentCount}, Processed: ${results.length}`);

    return new NextResponse(JSON.stringify({ success: true, processed: results.length, sent: sentCount }), { status: 200 });

  } catch (error: any) {
    console.error('Error in cron job:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}