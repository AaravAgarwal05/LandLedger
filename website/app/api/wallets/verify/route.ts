import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Nonce } from '@/models/Nonce';
import { Wallet } from '@/models/Wallet';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { ethers } from 'ethers';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nonceId, address, signature, network, typedData } = await req.json();

    if (!nonceId || !address || !signature || !typedData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    // 1. Verify Nonce
    const nonceDoc = await Nonce.findById(nonceId);
    if (!nonceDoc) {
      return NextResponse.json({ error: 'Invalid nonce' }, { status: 400 });
    }

    if (nonceDoc.used) {
      return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
    }

    if (new Date() > nonceDoc.expiresAt) {
      return NextResponse.json({ error: 'Nonce expired' }, { status: 400 });
    }

    if (nonceDoc.clerkUserId !== userId) {
      return NextResponse.json({ error: 'Nonce belongs to another user' }, { status: 400 });
    }

    if (nonceDoc.address && nonceDoc.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Address mismatch' }, { status: 400 });
    }

    // 2. Verify Signature
    const recoveredAddress = ethers.verifyTypedData(
      typedData.domain,
      typedData.types,
      typedData.value,
      signature
    );

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 3. Check if wallet is already linked to another user
    const existingWallet = await Wallet.findOne({
      address: address.toLowerCase(),
      network,
      deleted: false,
    });

    if (existingWallet && existingWallet.clerkUserId !== userId) {
      return NextResponse.json({ error: 'Wallet already linked to another account' }, { status: 409 });
    }

    // 4. Link Wallet (Upsert)
    let wallet = await Wallet.findOne({
      address: address.toLowerCase(),
      network,
      clerkUserId: userId,
    });

    if (wallet) {
      // Reactivate if deleted
      if (wallet.deleted) {
        wallet.deleted = false;
        wallet.verifiedAt = new Date();
        await wallet.save();
      }
    } else {
      // Create new
      wallet = await Wallet.create({
        clerkUserId: userId,
        address: address.toLowerCase(),
        network,
        label: 'MetaMask', // Default label
        source: 'metamask',
        verifiedAt: new Date(),
        addedAt: new Date(),
        deleted: false,
        primary: false, // Will check below
      });
    }

    // 5. Handle Primary Wallet
    const user = await User.findOne({ clerkUserId: userId });
    if (user && !user.primaryWalletId) {
      wallet.primary = true;
      await wallet.save();
      
      user.primaryWalletId = wallet._id;
      await user.save();
    }

    // 6. Mark Nonce Used
    nonceDoc.used = true;
    await nonceDoc.save();

    // 7. Audit Log
    await AuditLog.create({
      action: "wallet.linked",
      actorClerkId: userId,
      target: { type: "wallet", id: wallet._id.toString() },
      details: { address, network },
      timestamp: new Date(),
    });

    return NextResponse.json({
      ok: true,
      wallet,
    });

  } catch (error: any) {
    console.error('Wallet verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', details: error.message },
      { status: 500 }
    );
  }
}
