import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Land } from '@/models/Land';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    // Fetch lands that are publicly explorable (e.g. at least minted or pending_mint)
    const lands = await Land.find({ status: { $in: ['minted', 'pending_mint', 'registered', 'subdivided'] } }).sort({ createdAt: -1 }).limit(50);
    
    const mappedLands = lands.map(land => ({
      id: land.landId,
      tokenId: land.tokenId || 'N/A',
      name: land.landTitle || `Land ${land.landId}`,
      description: `${land.area} ${land.areaUnit} located in ${land.address?.city || 'N/A'}, ${land.address?.state || 'N/A'}. Survey No: ${land.surveyNo}`,
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      owner: land.ownerWallet,
      status: land.status
    }));

    return NextResponse.json({ success: true, lands: mappedLands });
  } catch (error: any) {
    console.error('Explore API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch explore data', details: error.message }, { status: 500 });
  }
}