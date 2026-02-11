import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { User, Wallet } from '@/models';

/**
 * GET /api/user/profile
 * Get current user profile
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

    const user = await User.findOne({ clerkUserId: userId })
      .populate('primaryWalletId');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch linked wallets
    const wallets = await Wallet.find({ 
      clerkUserId: userId,
      deleted: false 
    }).sort({ primary: -1, addedAt: -1 });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        kycStatus: user.kycStatus,
        publicProfile: user.publicProfile,
        primaryWallet: user.primaryWalletId,
        createdAt: user.createdAt,
        wallets: wallets, // Include wallets in user object
      },
    });

  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update user profile
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { displayName, publicProfile } = body;

    await dbConnect();

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (displayName) user.displayName = displayName;
    if (publicProfile) {
      user.publicProfile = {
        ...user.publicProfile,
        ...publicProfile,
      };
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        displayName: user.displayName,
        publicProfile: user.publicProfile,
      },
    });

  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
}
