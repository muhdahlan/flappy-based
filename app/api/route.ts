import { NextResponse } from 'next/server';
import { Wallet } from 'ethers'; // Import Wallet dari ethers

// URL ke hosted manifest Farcaster Anda
const FARCASTER_HOSTED_MANIFEST_URL = "https://api.farcaster.xyz/miniapps/hosted-manifest/019ab305-c421-eda0-9900-91ac64bc6d12";

// ownerAddress Anda dari Base Build
const OWNER_ADDRESS = "0x83327998662Af2174CFae423c31e5e2458257E34";

// Private key untuk menandatangani manifest, diambil dari variabel lingkungan
// PENTING: JANGAN PERNAH MENYIMPAN INI DI KODE ATAU GIT
const SIGNER_PRIVATE_KEY = process.env.FARCASTER_MANIFEST_PRIVATE_KEY; // Nama variabel lingkungan

export async function GET() {
  try {
    if (!SIGNER_PRIVATE_KEY) {
      throw new Error("FARCASTER_MANIFEST_PRIVATE_KEY is not set.");
    }

    // Ambil manifest asli dari Farcaster
    const response = await fetch(FARCASTER_HOSTED_MANIFEST_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Farcaster hosted manifest: ${response.statusText}`);
    }
    let manifest = await response.json();

    // Tambahkan properti baseBuilder
    manifest = {
      ...manifest,
      baseBuilder: {
        ownerAddress: OWNER_ADDRESS,
      },
    };

    // Buat wallet signer dari private key
    const signer = new Wallet(SIGNER_PRIVATE_KEY);

    // Ubah manifest menjadi string JSON untuk ditandatangani
    const manifestString = JSON.stringify(manifest);

    // Tandatangani manifest
    const signature = await signer.signMessage(manifestString);

    // Tambahkan signature ke manifest
    const signedManifest = {
      ...manifest,
      signature: signature,
    };

    // Kirim manifest yang sudah ditandatangani
    return new NextResponse(JSON.stringify(signedManifest), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600, must-revalidate' // Cache 10 menit
      },
    });

  } catch (error: any) {
    console.error("Error generating signed Farcaster manifest:", error);
    return new NextResponse(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}