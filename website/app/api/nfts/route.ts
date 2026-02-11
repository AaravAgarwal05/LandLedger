import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { NFTToken } from '@/models/NFTToken';
import { Wallet } from '@/models/Wallet';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // 1. Get all user's wallet addresses
    const userWallets = await Wallet.find({ 
      clerkUserId: userId, 
      deleted: false 
    }).select('address');

    const walletAddresses = userWallets.map(w => w.address.toLowerCase());

    if (walletAddresses.length === 0) {
      return NextResponse.json({ success: true, nfts: [] });
    }

    // 2. Find NFTs owned by these wallets
    // Note: We need to ensure ownerWallet in NFTToken is stored in lowercase
    const nfts = await NFTToken.find({ 
      ownerWallet: { $in: walletAddresses } 
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      nfts,
    });

  } catch (error: any) {
    console.error('Error fetching NFTs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs', details: error.message },
      { status: 500 }
    );
  }
}
