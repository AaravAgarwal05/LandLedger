import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Wallet } from '@/models/Wallet';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const wallets = await Wallet.find({ clerkUserId: userId, deleted: false })
      .select('address label network source')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      wallets,
    });

  } catch (error: any) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets', details: error.message },
      { status: 500 }
    );
  }
}
