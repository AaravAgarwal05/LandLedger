import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Listing } from '@/models/Listing';
import { Land } from '@/models/Land';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listingId } = await request.json();

    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
    }

    await dbConnect();

    const listing = await Listing.findOne({ listingId });
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.sellerClerkId !== userId) {
      return NextResponse.json({ error: 'You are not authorized to unlist this item' }, { status: 403 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ error: `Listing is already ${listing.status}` }, { status: 400 });
    }

    listing.status = 'cancelled';
    await listing.save();

    return NextResponse.json({ success: true, message: 'Listing removed successfully' });
  } catch (error: any) {
    console.error('Error removing listing:', error);
    return NextResponse.json({ error: 'Failed to remove listing', details: error.message }, { status: 500 });
  }
}
