import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { TradeRequest } from '@/models/TradeRequest';
import { Notification } from '@/models/Notification';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { landId, tokenId, buyerWallet, sellerClerkId, sellerWallet, initialPriceWei } = body;

    await dbConnect();

    // Create the trade request
    const tradeId = `TRD-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    const newTrade = await TradeRequest.create({
      tradeId,
      landId,
      tokenId,
      buyerClerkId: userId,
      buyerWallet,
      sellerClerkId,
      sellerWallet,
      agreedPrice: {
        amount: initialPriceWei,
        currency: 'ETH'
      },
      status: 'pending'
    });

    // Notify the seller
    await Notification.create({
      userId: sellerClerkId,
      type: 'trade_request',
      title: 'New Trade Request',
      message: `Someone wants to buy your land (ID: ${landId}).`,
      link: `/dashboard/trades/${tradeId}`
    });

    return NextResponse.json({ success: true, trade: newTrade });
  } catch (error: any) {
    console.error('Error creating trade request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch trades where user is buyer OR seller
    const trades = await TradeRequest.find({
      $or: [{ buyerClerkId: userId }, { sellerClerkId: userId }]
    }).sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, trades });
  } catch (error: any) {
    console.error('Error fetching trade requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
