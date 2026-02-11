import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Nonce } from '@/models/Nonce';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address, network } = await req.json();
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    await dbConnect();

    // Generate cryptographic nonce
    const nonceValue = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

    // Create nonce record
    const nonceDoc = await Nonce.create({
      clerkUserId: userId,
      address: address.toLowerCase(),
      nonce: nonceValue,
      type: 'wallet-link',
      expiresAt,
      used: false,
    });

    // EIP-712 Typed Data
    const typedData = {
      domain: {
        name: 'LandLedger',
        version: '1',
        chainId: network === 'sepolia' ? 11155111 : 1, // Default to mainnet if unknown, adjust as needed
      },
      types: {
        WalletLink: [
          { name: 'clerkUserId', type: 'string' },
          { name: 'nonce', type: 'string' },
          { name: 'issuedAt', type: 'string' },
        ],
      },
      value: {
        clerkUserId: userId,
        nonce: nonceValue,
        issuedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json({
      ok: true,
      nonceId: nonceDoc._id,
      typedData,
      expiresAt,
    });

  } catch (error: any) {
    console.error('Nonce generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce', details: error.message },
      { status: 500 }
    );
  }
}
