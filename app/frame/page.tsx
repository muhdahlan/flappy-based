import { Metadata } from 'next';

const APP_BASE_URL = 'https://flappy-based.vercel.app'; 
const MINI_APP_URL = 'https://farcaster.xyz/miniapps/gHz9rkxcK_mF/flappy-based'; 

export async function generateMetadata({ searchParams }: { 
  searchParams: { 
    score?: string; 
  } 
}): Promise<Metadata> {
  const scoreParam = searchParams.score;
  const score = scoreParam ? parseInt(scoreParam, 10) : null;

  const frameImage = `${APP_BASE_URL}/api/og?score=${score}`;
  const framePostUrl = `${APP_BASE_URL}/api/frame`; 

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
      'fc:frame': 'vNext',
      'fc:frame:image': frameImage,
      'fc:frame:post_url': framePostUrl,
      'fc:frame:button:1': 'Play Again',
      'fc:frame:button:1:action': 'link', 
      'fc:frame:button:1:target': MINI_APP_URL, 
      'fc:frame:button:2': 'Leaderboard',
      'fc:frame:button:2:action': 'post_redirect',
    },
  };
}

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