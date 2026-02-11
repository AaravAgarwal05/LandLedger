import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Wallet } from '@/models/Wallet';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { walletId } = await req.json();
    if (!walletId) {
      return NextResponse.json({ error: 'Wallet ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Verify wallet belongs to user
    const wallet = await Wallet.findOne({ _id: walletId, clerkUserId: userId, deleted: false });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Soft delete
    wallet.deleted = true;
    wallet.primary = false;
    await wallet.save();

    // If it was primary, unset it in User
    const user = await User.findOne({ clerkUserId: userId });
    if (user && user.primaryWalletId?.toString() === walletId) {
      user.primaryWalletId = undefined;
      
      // Try to find another wallet to set as primary
      const anotherWallet = await Wallet.findOne({ clerkUserId: userId, deleted: false }).sort({ addedAt: -1 });
      if (anotherWallet) {
        anotherWallet.primary = true;
        await anotherWallet.save();
        user.primaryWalletId = anotherWallet._id;
      }
      
      await user.save();
    }

    // Audit Log
    await AuditLog.create({
      action: "wallet.removed",
      actorClerkId: userId,
      target: { type: "wallet", id: wallet._id.toString() },
      details: { address: wallet.address },
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('Remove wallet error:', error);
    return NextResponse.json(
      { error: 'Failed to remove wallet', details: error.message },
      { status: 500 }
    );
  }
}
