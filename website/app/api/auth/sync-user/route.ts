import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';

/**
 * POST /api/auth/sync-user
 * Syncs Clerk user to MongoDB database
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data from request body
    const body = await req.json();
    const { email, displayName } = body;

    if (!displayName) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Check if user already exists
    let user = await User.findOne({ clerkUserId: userId });

    if (user) {
      // Update existing user
      user.email = email || user.email;
      user.displayName = displayName;
      await user.save();

      return NextResponse.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: user._id,
          clerkUserId: user.clerkUserId,
          email: user.email,
          displayName: user.displayName,
          roles: user.roles,
          kycStatus: user.kycStatus,
        },
      });
    }

    // Create new user
    user = await User.create({
      clerkUserId: userId,
      email: email || undefined,
      displayName,
      roles: ['user'],
      kycStatus: 'none',
      publicProfile: {},
      metadata: {},
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        kycStatus: user.kycStatus,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Failed to sync user', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/sync-user
 * Get current user from database
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

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

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
        primaryWalletId: user.primaryWalletId,
      },
    });

  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}
