import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { TradeRequest } from "@/models/TradeRequest";
import { Message } from "@/models/Message";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tradeId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tradeId } = await params;
    await dbConnect();

    const trade = await TradeRequest.findOne({ tradeId });
    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    // Verify user is part of the trade
    if (trade.buyerClerkId !== userId && trade.sellerClerkId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to view this trade" },
        { status: 403 },
      );
    }

    // Get messages (polling will use this) // TODO: Implement WebSockets or keep doing long polling
    const messages = await Message.find({ tradeId }).sort({ createdAt: 1 });

    return NextResponse.json({ success: true, trade, messages });
  } catch (error: any) {
    console.error("Error fetching trade details:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
