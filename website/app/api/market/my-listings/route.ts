import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Listing } from '@/models/Listing';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch user's listings
    const listings = await Listing.find({ sellerClerkId: userId }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, listings });
  } catch (error: any) {
    console.error('Error fetching my listings:', error);
    return NextResponse.json({ error: 'Failed to fetch listings', details: error.message }, { status: 500 });
  }
}
