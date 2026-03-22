import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Land } from '@/models/Land';
import { Listing } from '@/models/Listing';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    await dbConnect();

    // Support both MongoDB _id and custom landId
    const query = id.match(/^[0-9a-fA-F]{24}$/) 
      ? { $or: [{ _id: id }, { landId: id }] }
      : { landId: id };

    const land = await Land.findOne(query);

    if (!land) {
      return NextResponse.json({ error: 'Land not found' }, { status: 404 });
    }

    // Find if there's an active listing for this land
    let activeListing = null;
    if (land.tokenId) {
      activeListing = await Listing.findOne({ tokenId: land.tokenId, status: 'active' });
    }

    return NextResponse.json({
      success: true,
      land: {
        ...land.toObject(),
        activeListing
      }
    });

  } catch (error: any) {
    console.error('Error fetching land:', error);
    return NextResponse.json(
      { error: 'Failed to fetch land', details: error.message },
      { status: 500 }
    );
  }
}
