import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TradeRequest } from "@/models/TradeRequest";
import { auth } from "@clerk/nextjs";

export async function PATCH(req: Request, { params }: { params: { tradeId: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status, txHash } = body;

    await connectToDatabase();

    const trade = await TradeRequest.findOne({ tradeId: params.tradeId });
    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    // Optional: verification of user identity in the trade could be added here
    if (trade.buyerClerkId !== userId && trade.sellerClerkId !== userId) {
      return NextResponse.json({ error: "Not part of this trade" }, { status: 403 });
    }

    trade.status = status;
    if (txHash) {
      // Store txHash in trade doc if required or emit an event
      (trade as any).latestTxHash = txHash;
    }

    await trade.save();

    return NextResponse.json({ success: true, trade });
  } catch (error: any) {
    console.error("Error updating trade status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
