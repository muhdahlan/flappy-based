import { Metadata } from 'next';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const score = typeof searchParams.score === 'string' ? searchParams.score : '0';
  const host = 'https://flappy-based.vercel.app';

  const ogImageUrl = `${host}/api/og?score=${score}&ts=${Date.now()}`;
  const appUrl = `${host}/`;

  return {
    title: `Flappy Based Score: ${score}`,
    description: 'Can you beat my score on Flappy Based?',
    openGraph: {
      title: `Flappy Based Score: ${score}`,
      description: 'Can you beat my score on Flappy Based?',
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    other: {
      'fc:frame': JSON.stringify({
        version: "next",
        imageUrl: ogImageUrl,
        button: {
          title: "Play Now & Beat Score! 🐦",
          action: {
            type: "launch_frame",
            name: "Flappy Based",
            url: appUrl,
            splashImageUrl: `${host}/opengraph-image.png`,
            splashBackgroundColor: "#4EC0CA"
          }
        }
      })
    },
  };
}

export default function FramePage({ searchParams }: Props) {
  console.log('🔍 DEBUG KOMPONEN: searchParams yang diterima halaman:', JSON.stringify(searchParams));

  const score = typeof searchParams.score === 'string' ? searchParams.score : '0';
  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif', color: '#333' }}>
      <h1>Flappy Based Score: {score}</h1>
      <p>Open this link in a Farcaster client (like Warpcast) to play!</p>
    </div>
  );
}