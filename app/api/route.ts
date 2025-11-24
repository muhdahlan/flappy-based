import { NextResponse } from 'next/server';

// URL ke hosted manifest Farcaster Anda
const FARCASTER_HOSTED_MANIFEST_URL = "https://api.farcaster.xyz/miniapps/hosted-manifest/019ab305-c421-eda0-9900-91ac64bc6d12";

// Ganti dengan ownerAddress Anda yang sebenarnya dari Base Build
const OWNER_ADDRESS = "0x83327998662Af2174CFae423c31e5e2458257E34";

export async function GET() {
  try {
    // Ambil manifest asli dari Farcaster
    const response = await fetch(FARCASTER_HOSTED_MANIFEST_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Farcaster hosted manifest: ${response.statusText}`);
    }
    const manifest = await response.json();

    // Tambahkan properti baseBuilder
    const modifiedManifest = {
      ...manifest,
      baseBuilder: {
        ownerAddress: OWNER_ADDRESS,
      },
    };

    // Kirim manifest yang dimodifikasi
    return new NextResponse(JSON.stringify(modifiedManifest), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600, must-revalidate' // Cache 10 menit
      },
    });

  } catch (error: any) {
    console.error("Error generating Farcaster manifest:", error);
    return new NextResponse(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}