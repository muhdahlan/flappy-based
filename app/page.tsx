'use client';

import { useEffect, useState, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';
import { getSession, signIn } from 'next-auth/react';
import { encodeFunctionData, parseAbi } from 'viem';

const CLAIM_ABI = parseAbi([
  'function claim(uint256 amount, uint256 nonce, bytes calldata signature) external'
]);

const CONTRACT_CONFIG = {
  degen: {
    address: '0xe5CBd6aE020807de9327cb149dE1aA432E37291d', // Base
    chainId: 8453,
    name: 'Base'
  },
  arb: {
    address: '0xc5e582aB8C9f9A6C3eD612CADdB06E5814aa18EC', // Arbitrum One
    chainId: 42161,
    name: 'Arbitrum One'
  },
  celo: {
    address: '0xc5e582aB8C9f9A6C3eD612CADdB06E5814aa18EC', // Celo
    chainId: 42220,
    name: 'Celo'
  }
} as const;

type CoinType = keyof typeof CONTRACT_CONFIG;

interface UserState {
  fid: number;
  score: number;
  username?: string;
  pfpUrl?: string;
}

export default function Home() {
  const [context, setContext] = useState<any | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [showClaimMenu, setShowClaimMenu] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  const fetchUserData = useCallback(async (fid: number) => {
    try {
      const response = await fetch(`/api/user?fid=${fid}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }, []);

  useEffect(() => {
    const initSDK = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);

        if (ctx?.user?.verifiedAddresses && ctx.user.verifiedAddresses.length > 0) {
            setUserAddress(ctx.user.verifiedAddresses[0]);
        } else if (ctx?.user?.custodyAddress) {
            setUserAddress(ctx.user.custodyAddress);
        }

        if (ctx?.user?.fid) {
          const session = await getSession();
          if (!session) {
            await signIn('credentials', {
              fid: ctx.user.fid,
              redirect: false,
            });
          }
          await fetchUserData(ctx.user.fid);
        }
      } catch (err) {
        console.error('Error initializing SDK:', err);
      } finally {
        setIsSDKLoaded(true);
        sdk.actions.ready();
      }
    };

    if (!isSDKLoaded) {
      initSDK();
    }
  }, [isSDKLoaded, fetchUserData]);

  const handleClaimOnChain = async (coin: CoinType) => {
    if (!user || !userAddress) {
        setClaimMessage("Error: Wallet address not found. Please connect to Farcaster.");
        return;
    }

    setIsClaiming(true);
    setClaimMessage(null);
    const config = CONTRACT_CONFIG[coin];
    
    try {
      setClaimMessage(`Requesting authorization for ${coin.toUpperCase()}...`);

      const apiResponse = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            fid: user.fid,
            userAddress: userAddress,
            coin: coin
        })
      });

      const backendData = await apiResponse.json();

      if (!apiResponse.ok || !backendData.success) {
        throw new Error(backendData.error || "Failed to get server authorization.");
      }

      setClaimMessage(`Preparing blockchain transaction...`);
      
      const encodedTransactionData = encodeFunctionData({
        abi: CLAIM_ABI,
        functionName: 'claim', 
        args: [
            BigInt(backendData.amount), 
            BigInt(backendData.nonce), 
            backendData.signature
        ] 
      });

      setClaimMessage(`Please sign the transaction in your wallet (${config.name})...`);

      const txHash = await sdk.actions.transaction({
        chainId: `eip155:${config.chainId}`, 
        to: config.address as `0x${string}`, 
        data: encodedTransactionData,        
        value: "0", 
      });

      console.log('Transaction submitted:', txHash);
      setClaimMessage(`🎉 Claim Successful! Transaction is processing.`);
      
      setTimeout(() => {
        setShowClaimMenu(false);
        setClaimMessage(null);
      }, 5000);

    } catch (err: any) {
      console.error('Claim error:', err);
      if (err.message?.includes('User rejected')) {
        setClaimMessage('Transaction rejected by user.');
      } else {
        setClaimMessage(`Failed: ${err.message}`);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isSDKLoaded || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#4EC0CA] p-4">
        <div className="text-2xl font-bold text-white">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#4EC0CA] p-4 font-sans relative">
      <div className="absolute top-4 left-4 flex items-center space-x-2 bg-white/20 p-2 rounded-lg backdrop-blur-sm">
        {user.pfpUrl && (
          <img src={user.pfpUrl} alt="Profile" className="w-8 h-8 rounded-full" />
        )}
        <span className="text-white font-bold">
          {user.username || `FID: ${user.fid}`}
        </span>
      </div>

      <div className="mt-32 mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
          FLAPPY BASED
        </h1>
        <p className="text-white text-lg opacity-90">High Score: {user.score}</p>
        {!userAddress && (
             <p className="text-red-200 text-sm bg-red-900/30 px-2 rounded mt-2">⚠️ Wallet address not found. Claiming will fail.</p>
        )}
      </div>

      <button
        onClick={() => window.location.href = `/game?fid=${user.fid}`}
        className="bg-[#F5A623] hover:bg-[#E09512] text-white font-bold py-3 px-8 rounded-full text-xl shadow-[0_4px_0_#C8830F] transform transition-all active:translate-y-1 active:shadow-[0_0_0_#C8830F] mb-6 w-48"
      >
        PLAY
      </button>

      <div className="flex flex-col items-center w-full max-w-sm z-10">
        {!showClaimMenu ? (
          <button
            onClick={() => setShowClaimMenu(true)}
            disabled={!userAddress || user.score < 5}
            className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-6 rounded-full text-lg shadow-lg transition-all w-64 mb-4 flex items-center justify-center space-x-2 border-2 border-white/20 ${(!userAddress || user.score < 5) ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-700 hover:to-blue-700'}`}
          >
            <span>🎁</span> <span>Claim Rewards</span>
          </button>
        ) : (
          <div className="bg-white/95 p-5 rounded-2xl shadow-2xl w-full animate-fade-in border-2 border-blue-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-800 font-extrabold text-lg">Select Daily Reward:</h3>
              <button 
                onClick={() => { setShowClaimMenu(false); setClaimMessage(null); }}
                className="text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full p-1 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            
            {claimMessage && (
              <div className={`text-center mb-4 text-sm font-medium p-3 rounded-lg break-words ${
                claimMessage.includes('Failed') || claimMessage.includes('rejected') || claimMessage.includes('Error')
                ? 'bg-red-100 text-red-700 border border-red-200' 
                : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {claimMessage}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <ClaimButton 
                coin="degen" icon="🟣" label="1 DEGEN" subLabel="(Base)"
                onClick={() => handleClaimOnChain('degen')} disabled={isClaiming} 
              />
              <ClaimButton 
                coin="arb" icon="🔵" label="0.05 ARB" subLabel="(Arbitrum)"
                onClick={() => handleClaimOnChain('arb')} disabled={isClaiming} 
              />
              <ClaimButton 
                coin="celo" icon="🟢" label="0.05 CELO" subLabel="(Celo)"
                onClick={() => handleClaimOnChain('celo')} disabled={isClaiming} 
              />
            </div>
            <p className="text-xs text-center text-gray-500 mt-4 leading-tight">
              Requirement: Minimum score 5. Your wallet will pop up to sign and pay gas.
            </p>
          </div>
        )}
      </div>

      <a href="/leaderboard" className="mt-4 text-white underline hover:text-gray-100 transition-colors">
        View Leaderboard
      </a>
    </main>
  );
}

function ClaimButton({ coin, icon, label, subLabel, onClick, disabled }: { 
  coin: CoinType, icon: string, label: string, subLabel: string, onClick: () => void, disabled: boolean 
}) {
  const styles = {
    degen: 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200',
    arb: 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200',
    celo: 'bg-green-50 hover:bg-green-100 text-green-900 border-green-200'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center p-2 rounded-xl transition-all border-2 ${styles[coin]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md active:scale-95'}`}
    >
      <span className="text-2xl mb-1 drop-shadow-sm">{icon}</span>
      <span className="text-xs font-black text-center leading-tight">{label}</span>
      <span className="text-[10px] font-medium opacity-70">{subLabel}</span>
    </button>
  );
}