import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { TradeRequest } from '@/models/TradeRequest';
import { Message } from '@/models/Message';
import { Notification } from '@/models/Notification';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request, { params }: { params: Promise<{ tradeId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tradeId } = await params;
    const body = await req.json();
    const { content, type, newPriceWei } = body;

    await dbConnect();

    const trade = await TradeRequest.findOne({ tradeId });
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const isBuyer = trade.buyerClerkId === userId;
    const isSeller = trade.sellerClerkId === userId;

    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Handle normal chat message
    if (type === 'chat') {
      const msg = await Message.create({
        tradeId,
        senderClerkId: userId,
        senderRole: isBuyer ? 'buyer' : 'seller',
        content,
        isSystemMessage: false
      });

      // Notify other party
      await Notification.create({
        userId: isBuyer ? trade.sellerClerkId : trade.buyerClerkId,
        type: 'message',
        title: 'New Message',
        message: `You have an unread message in Trade ${tradeId}`,
        link: `/dashboard/trades/${tradeId}`
      });

      return NextResponse.json({ success: true, message: msg });
    }

    // Handle proposal (changing the price)
    if (type === 'proposal' && newPriceWei) {
      trade.agreedPrice.amount = newPriceWei;
      trade.status = 'negotiating';
      await trade.save();

      const msg = await Message.create({
        tradeId,
        senderClerkId: userId,
        senderRole: isBuyer ? 'buyer' : 'seller',
        content: content || `Proposed a new price`, // content comes in as formatted INR string from frontend
        isSystemMessage: true,
        type: 'proposal'
      });

      return NextResponse.json({ success: true, message: msg, trade });
    }

    // Handle Accepting the terms
    if (type === 'accept') {
      trade.status = 'approved';
      await trade.save();

      const msg = await Message.create({
        tradeId,
        senderClerkId: userId,
        senderRole: isBuyer ? 'buyer' : 'seller',
        content: `Accepted the terms! Waiting for Escrow initialization.`,
        isSystemMessage: true,
        type: 'accept'
      });

      return NextResponse.json({ success: true, message: msg, trade });
    }

    // Handle on-chain event logs
    if (type === 'on_chain_action') {
      const msg = await Message.create({
        tradeId,
        senderClerkId: userId,
        senderRole: isBuyer ? 'buyer' : 'seller',
        content,
        isSystemMessage: true,
        type: 'on_chain_action',
      });

      return NextResponse.json({ success: true, message: msg });
    }

    return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error posting message/action to trade:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
