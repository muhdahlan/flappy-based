import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked, toBytes, parseEther } from 'viem';

const REWARD_AMOUNTS = {
  degen: parseEther('1'),      // 1 DEGEN
  arb: parseEther('0.05'),     // 0.05 ARB
  celo: parseEther('0.05')     // 0.05 CELO
};

const MIN_SCORE_TO_CLAIM = 5; 

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fid, userAddress, coin } = body;

    if (!fid || !userAddress || !coin || !REWARD_AMOUNTS[coin as keyof typeof REWARD_AMOUNTS]) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY as `0x${string}`;
    if (!SIGNER_PRIVATE_KEY) {
      console.error('SIGNER_PRIVATE_KEY is not set in Vercel Environment Variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const userKey = `user:${fid}`;
    const userData = await kv.hgetall(userKey) as any;
    const currentScore = Number(userData?.score || 0);

    if (currentScore < MIN_SCORE_TO_CLAIM) {
        return NextResponse.json({ error: `Minimum score required: ${MIN_SCORE_TO_CLAIM}. Play more!` }, { status: 403 });
    }

    const cooldownKey = `claim:${coin}:${fid}`;
    const hasClaimedToday = await kv.get(cooldownKey);

    if (hasClaimedToday) {
      return NextResponse.json({ error: `You already claimed ${coin.toUpperCase()} today. Try again tomorrow!` }, { status: 429 });
    }

    const rewardAmount = REWARD_AMOUNTS[coin as keyof typeof REWARD_AMOUNTS];
    const nonce = BigInt(Date.now());

    const messageHash = keccak256(
      encodePacked(
        ['address', 'uint256', 'uint256'],
        [userAddress as `0x${string}`, rewardAmount, nonce]
      )
    );

    const account = privateKeyToAccount(SIGNER_PRIVATE_KEY);
    const signature = await account.signMessage({ message: { raw: toBytes(messageHash) } });

    await kv.set(cooldownKey, 'claimed', { ex: 86400 });

    return NextResponse.json({
      success: true,
      amount: rewardAmount.toString(),
      nonce: nonce.toString(),
      signature: signature,
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}