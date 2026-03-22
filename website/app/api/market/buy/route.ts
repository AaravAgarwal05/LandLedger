import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Listing } from '@/models/Listing';
import { Land } from '@/models/Land';
import { NFTToken } from '@/models/NFTToken';
import { User } from '@/models/User';
import { Wallet } from '@/models/Wallet';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listingId } = await request.json();

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    await dbConnect();

    // 1. Get the current user's primary wallet
    const buyerWalletDoc = await Wallet.findOne({ clerkUserId: userId, isPrimary: true, deleted: false });
    if (!buyerWalletDoc) {
      return NextResponse.json({ error: 'Please connect and set a primary wallet first' }, { status: 400 });
    }
    const buyerWallet = buyerWalletDoc.address.toLowerCase();

    // 2. Find the listing
    const listing = await Listing.findOne({ listingId, status: 'active' });
    if (!listing) {
      return NextResponse.json({ error: 'Listing is no longer active or not found' }, { status: 404 });
    }

    // 3. Prevent buying own listing
    if (listing.sellerClerkId === userId) {
      return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 400 });
    }

    // 4. Update the Listing
    listing.status = 'sold';
    await listing.save();

    // 5. Update NFT ownership
    const nft = await NFTToken.findOne({ tokenId: listing.tokenId, tokenAddress: listing.tokenAddress });
    if (nft) {
      nft.ownerWallet = buyerWallet;
      nft.provenance.push({
        action: 'transfer',
        txHash: 'SIMULATED-TX-' + Date.now(),
        timestamp: new Date(),
        from: listing.sellerWallet,
        to: buyerWallet,
        note: `Purchased via marketplace for ${listing.price.amount} ${listing.price.currency}`
      });
      await nft.save();
    }

    // 6. Update Land ownership
    const land = await Land.findOne({ tokenId: listing.tokenId });
    if (land) {
      land.ownerClerkId = userId;
      land.ownerWallet = buyerWallet;
      
      land.statusHistory.push({
        status: land.status,
        changedAt: new Date(),
        changedBy: userId,
        notes: `Ownership transferred via marketplace purchase from ${listing.sellerWallet} to ${buyerWallet}`
      });
      
      await land.save();
    }

    return NextResponse.json({ success: true, message: 'Successfully purchased land' });
  } catch (error: any) {
    console.error('Error processing purchase:', error);
    return NextResponse.json({ error: 'Failed to process purchase', details: error.message }, { status: 500 });
  }
}
