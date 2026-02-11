import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import { Wallet } from "@/models/Wallet";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletId } = await req.json();
    if (!walletId) {
      return NextResponse.json(
        { error: "Wallet ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify wallet belongs to user
    const wallet = await Wallet.findOne({
      _id: walletId,
      clerkUserId: userId,
      deleted: false,
    });
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Transaction-like updates
    // 1. Unset other primary wallets
    await Wallet.updateMany(
      { clerkUserId: userId, _id: { $ne: walletId } },
      { $set: { primary: false } }
    );

    // 2. Set this wallet as primary
    wallet.primary = true;
    await wallet.save();

    // 3. Update User
    await User.findOneAndUpdate(
      { clerkUserId: userId },
      { $set: { primaryWalletId: wallet._id } }
    );

    // 4. Audit Log
    await AuditLog.create({
      action: "wallet.set_primary",
      actorClerkId: userId,
      target: { type: "wallet", id: wallet._id.toString() },
      details: { address: wallet.address },
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true, wallet });
  } catch (error: any) {
    console.error("Set primary wallet error:", error);
    return NextResponse.json(
      { error: "Failed to set primary wallet", details: error.message },
      { status: 500 }
    );
  }
}
