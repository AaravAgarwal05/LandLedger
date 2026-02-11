import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Land } from '@/models/Land';
import { formatLandAsNFTMetadata, validateNFTMetadata } from '@/lib/nft-metadata';
import { uploadMetadataToIPFS, getIPFSGatewayURL } from '@/lib/nft-storage';

/**
 * POST /api/lands/[id]/pin
 * Pin land metadata to IPFS using NFT.Storage
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Connect to database
    await dbConnect();

    // Find the land by ID
    const land = await Land.findById(id);

    if (!land) {
      return NextResponse.json(
        { error: 'Land not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (land.ownerClerkId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to pin this land' },
        { status: 403 }
      );
    }

    // Check if already pinned
    if (land.ipfsCid) {
      return NextResponse.json(
        {
          success: true,
          message: 'Land metadata already pinned to IPFS',
          ipfsCid: land.ipfsCid,
          ipfsUrl: getIPFSGatewayURL(land.ipfsCid),
          metadata: formatLandAsNFTMetadata(land),
        },
        { status: 200 }
      );
    }

    console.log('--- Pinning Land Metadata to IPFS ---');
    console.log(`Land ID: ${land.landId}`);
    console.log(`MongoDB _id: ${land._id}`);

    // Format land data as NFT metadata
    const metadata = formatLandAsNFTMetadata(land);

    // Validate metadata
    try {
      validateNFTMetadata(metadata);
      console.log('✅ Metadata validation passed');
    } catch (validationError: any) {
      console.error('❌ Metadata validation failed:', validationError.message);
      return NextResponse.json(
        { error: 'Invalid metadata format', details: validationError.message },
        { status: 400 }
      );
    }

    // Upload metadata to IPFS via NFT.Storage
    let ipfsCid: string;
    try {
      ipfsCid = await uploadMetadataToIPFS(metadata);
      console.log(`✅ Metadata pinned to IPFS: ${ipfsCid}`);
    } catch (uploadError: any) {
      console.error('❌ Failed to upload to IPFS:', uploadError.message);
      return NextResponse.json(
        { error: 'Failed to upload metadata to IPFS', details: uploadError.message },
        { status: 500 }
      );
    }

    // Update land document with IPFS CID
    land.ipfsCid = ipfsCid;
    await land.save();

    console.log('✅ Land document updated with IPFS CID');
    console.log('--------------------------------------');

    return NextResponse.json({
      success: true,
      message: 'Land metadata successfully pinned to IPFS',
      landId: land.landId,
      ipfsCid,
      ipfsUrl: getIPFSGatewayURL(ipfsCid),
      ipfsProtocol: `ipfs://${ipfsCid}`,
      metadata,
    });

  } catch (error: any) {
    console.error('Error pinning land metadata:', error);
    return NextResponse.json(
      { error: 'Failed to pin land metadata', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lands/[id]/pin
 * Get pinned metadata information for a land
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Connect to database
    await dbConnect();

    // Find the land by ID
    const land = await Land.findById(id);

    if (!land) {
      return NextResponse.json(
        { error: 'Land not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (land.ownerClerkId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to view this land' },
        { status: 403 }
      );
    }

    // Check if pinned
    if (!land.ipfsCid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Land metadata not yet pinned to IPFS',
          isPinned: false,
        },
        { status: 200 }
      );
    }

    // Return pinned information
    return NextResponse.json({
      success: true,
      isPinned: true,
      landId: land.landId,
      ipfsCid: land.ipfsCid,
      ipfsUrl: getIPFSGatewayURL(land.ipfsCid),
      ipfsProtocol: `ipfs://${land.ipfsCid}`,
      metadata: formatLandAsNFTMetadata(land),
    });

  } catch (error: any) {
    console.error('Error fetching pinned metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pinned metadata', details: error.message },
      { status: 500 }
    );
  }
}
