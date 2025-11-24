/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // --- KONFIGURASI BASE MINI APP BARU ---
  baseBuilder: {
    ownerAddress: "0x83327998662Af2174CFae423c31e5e2458257E34",
  },
};

module.exports = nextConfig;