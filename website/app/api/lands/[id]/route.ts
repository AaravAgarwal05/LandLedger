import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Land } from '@/models/Land';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const land = await Land.findOne({ _id: id });

    if (!land) {
      return NextResponse.json({ error: 'Land not found' }, { status: 404 });
    }

    // Optional: Check ownership if you want to restrict viewing
    // if (land.ownerClerkId !== userId) { ... }

    return NextResponse.json({
      success: true,
      land,
    });

  } catch (error: any) {
    console.error('Error fetching land:', error);
    return NextResponse.json(
      { error: 'Failed to fetch land', details: error.message },
      { status: 500 }
    );
  }
}
