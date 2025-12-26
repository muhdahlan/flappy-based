import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startOfDay } from 'date-fns';

// --- CONFIGURATION ---
// REPLACE WITH YOUR ACTUAL NEYNAR API KEY
const FARCASTER_HUB_API_KEY = '8076C074-CE48-4866-8389-43177E043B11'; 
const BATCH_SIZE = 20; // Number of users to process per batch

// Initialize Supabase Admin Client (Requires SUPABASE_SERVICE_ROLE_KEY in Vercel Env Vars)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(request: Request) {
  // Verify Cron Secret from Vercel
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Uncomment the following line in production for security
    // return new NextResponse('Unauthorized', { status: 401 });
    console.warn('Warning: Unauthorized access attempt or manual trigger without secret.');
  }

  try {
    console.log('Starting hourly notification batch job...');
    const todayStart = startOfDay(new Date()).toISOString();

    // 1. Get candidates from the database (via RPC function)
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

    // 2. Define notification message content
    const title = "Daily Flappy Reminder 🐦";
    const body = "Haven't played Flappy Based today? Tap to set a new high score!";
    const url = 'https://flappy-based.vercel.app';

    // 3. Send notifications and log results
    const results = await Promise.all(candidates.map(async (user: any) => {
      const fid = user.fid;
      let status = 'failed';

      try {
        // Send notification via Neynar API
        const response = await fetch('https://api.neynar.com/v2/farcaster/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key': FARCASTER_HUB_API_KEY,
            'accept': 'application/json',
          },
          body: JSON.stringify({ recipient_fid: fid, title, body, url }),
        });

        if (response.ok) {
          status = 'sent';
        } else if (response.status === 400 || response.status === 403) {
          // Handle cases where the user cannot receive notifications
          status = 'opted_out';
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Neynar error for FID ${fid}:`, response.status, errorData);
        }

      } catch (err) {
        console.error(`Error sending to FID ${fid}:`, err);
        status = 'error';
      }

      // Log the result to the database to prevent re-sending today
      const { error: logError } = await supabaseAdmin
        .from('daily_notification_log')
        .upsert({ 
          fid, 
          last_sent_at: new Date().toISOString(), 
          status 
        }, { onConflict: 'fid' });
      
      if (logError) console.error(`Failed to log notification for FID ${fid}:`, logError);

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