import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Listing } from '@/models/Listing';
import { Land } from '@/models/Land';
import { NFTToken } from '@/models/NFTToken';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    // Fetch active listings
    const listings = await Listing.find({ status: 'active' }).sort({ createdAt: -1 });
    
    const enrichedListings = await Promise.all(listings.map(async (listing) => {
      const token = await NFTToken.findOne({ tokenId: listing.tokenId, tokenAddress: listing.tokenAddress });
      const land = token ? await Land.findOne({ landId: token.landId }) : null;
      
      return {
        listingId: listing.listingId,
        tokenId: listing.tokenId,
        price: listing.price.amount,
        currency: listing.price.currency,
        name: land ? land.landTitle : `Land Token #${listing.tokenId}`,
        description: land ? `${land.area} ${land.areaUnit} at ${land.address?.city || ''}, ${land.address?.state || ''}` : 'Real estate NFT',
        image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Default image or derive from metadata
        sellerWallet: listing.sellerWallet,
        landId: land ? land.landId : null
      };
    }));

    return NextResponse.json({ success: true, listings: enrichedListings });
  } catch (error: any) {
    console.error('Market API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch market listings', details: error.message }, { status: 500 });
  }
}