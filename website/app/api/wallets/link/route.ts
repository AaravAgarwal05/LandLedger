import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { User, Wallet } from '@/models';
import { AuditLog } from '@/models';

/**
 * POST /api/wallets/link
 * Link a wallet to user account (keeps wallet connection separate from auth)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { address, label, network, source, signature } = body;

    // Validate required fields
    if (!address || !label || !network || !source) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get user from database
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({
      address: address.toLowerCase(),
      network,
    });

    if (existingWallet && !existingWallet.deleted) {
      return NextResponse.json(
        { error: 'Wallet already linked to an account' },
        { status: 409 }
      );
    }

    // Create wallet
    const wallet = await Wallet.create({
      clerkUserId: userId,
      address: address.toLowerCase(),
      label,
      network,
      source,
      primary: false,
      verifiedAt: signature ? new Date() : undefined,
      addedAt: new Date(),
      lastSeenAt: new Date(),
      deleted: false,
    });

    // If this is the first wallet, make it primary
    if (!user.primaryWalletId) {
      user.primaryWalletId = wallet._id;
      await user.save();
      
      wallet.primary = true;
      await wallet.save();
    }

    // Log the action
    await AuditLog.create({
      action: 'wallet.linked',
      actorClerkId: userId,
      actorWallet: address.toLowerCase(),
      target: {
        type: 'wallet',
        id: wallet._id.toString(),
      },
      details: {
        address: address.toLowerCase(),
        network,
        source,
        label,
      },
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Wallet linked successfully',
      wallet: {
        id: wallet._id,
        address: wallet.address,
        label: wallet.label,
        network: wallet.network,
        primary: wallet.primary,
        verifiedAt: wallet.verifiedAt,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error linking wallet:', error);
    return NextResponse.json(
      { error: 'Failed to link wallet', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallets/link
 * Get all wallets for current user
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const wallets = await Wallet.find({
      clerkUserId: userId,
      deleted: false,
    }).sort({ primary: -1, addedAt: -1 });

    return NextResponse.json({
      success: true,
      wallets: wallets.map(w => ({
        id: w._id,
        address: w.address,
        label: w.label,
        network: w.network,
        primary: w.primary,
        source: w.source,
        verifiedAt: w.verifiedAt,
        addedAt: w.addedAt,
        lastSeenAt: w.lastSeenAt,
      })),
    });

  } catch (error: any) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets', details: error.message },
      { status: 500 }
    );
  }
}
