import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

const host = 'https://flappy-based.vercel.app';

export const metadata: Metadata = {
  title: 'Flappy Based',
  description: 'Play Flappy Bird on Farcaster!',
  openGraph: {
    title: 'Flappy Based',
    description: 'Play Flappy Bird on Farcaster!',
    url: host,
    siteName: 'Flappy Based',
    images: [
      {
        url: `${host}/icon.png`,
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  other: {
    "base:app_id": "69392382e6be54f5ed71d4ee",
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${host}/icon.png`,
      button: {
        title: "Play Flappy Based 🐦",
        action: {
          type: "launch_frame",
          name: "Flappy Based",
          url: host,
          splashImageUrl: `${host}/icon.png`,
          splashBackgroundColor: "#4EC0CA"
        }
      }
    })
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}