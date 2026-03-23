import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Listing } from '@/models/Listing';
import { Land } from '@/models/Land';
import { NFTToken } from '@/models/NFTToken';
import { customAlphabet } from 'nanoid';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tokenId, price, currency, priceInr } = await request.json();

    if (!tokenId || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ALWAYS store as ETH — frontend may send INR display value but currency is normalized here
    const storedCurrency = 'ETH';

    await dbConnect();

    // Find the land
    const land = await Land.findOne({ tokenId: tokenId });
    if (!land) {
      return NextResponse.json({ error: 'NFT not found' }, { status: 404 });
    }

    if (land.ownerClerkId !== userId) {
      return NextResponse.json({ error: 'You do not own this land' }, { status: 403 });
    }

    // Check if already active
    const activeListing = await Listing.findOne({ tokenId, status: 'active' });
    if (activeListing) {
      return NextResponse.json({ error: 'Already listed' }, { status: 400 });
    }

    const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
    const listingId = `LIST-${nanoid()}`;

    const newListing = new Listing({
      listingId,
      tokenAddress: land.tokenAddress || '0x',
      tokenId,
      network: 'sepolia',
      sellerClerkId: userId,
      sellerWallet: land.ownerWallet,
      price: {
        amount: parseFloat(price),
        currency: storedCurrency
      },
      status: 'active'
    });

    await newListing.save();

    return NextResponse.json({ success: true, listingId: newListing.listingId });
  } catch (error: any) {
    console.error('Error creating listing:', error);
    return NextResponse.json({ error: 'Failed to create listing', details: error.message }, { status: 500 });
  }
}
