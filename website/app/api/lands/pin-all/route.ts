import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Land } from '@/models/Land';
import { formatLandAsNFTMetadata, validateNFTMetadata } from '@/lib/nft-metadata';
import { uploadMetadataToIPFS, getIPFSGatewayURL } from '@/lib/nft-storage';

/**
 * POST /api/lands/pin-all
 * Bulk pin all user's land metadata to IPFS using NFT.Storage
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Find all lands owned by the user that haven't been pinned yet
    const unpinnedLands = await Land.find({
      ownerClerkId: userId,
      ipfsCid: { $exists: false },
    });

    if (unpinnedLands.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All lands are already pinned to IPFS',
        pinnedCount: 0,
        totalLands: await Land.countDocuments({ ownerClerkId: userId }),
      });
    }

    console.log('--- Bulk Pinning Land Metadata to IPFS ---');
    console.log(`User: ${userId}`);
    console.log(`Unpinned lands: ${unpinnedLands.length}`);

    const results = [];
    const errors = [];

    // Pin each land sequentially
    for (const land of unpinnedLands) {
      try {
        console.log(`\nProcessing: ${land.landId}`);

        // Format land data as NFT metadata
        const metadata = formatLandAsNFTMetadata(land);

        // Validate metadata
        validateNFTMetadata(metadata);

        // Upload metadata to IPFS via NFT.Storage
        const ipfsCid = await uploadMetadataToIPFS(metadata);

        // Update land document with IPFS CID
        land.ipfsCid = ipfsCid;
        await land.save();

        results.push({
          landId: land.landId,
          _id: land._id,
          ipfsCid,
          ipfsUrl: getIPFSGatewayURL(ipfsCid),
          success: true,
        });

        console.log(`✅ Successfully pinned: ${land.landId} -> ${ipfsCid}`);
      } catch (error: any) {
        console.error(`❌ Failed to pin ${land.landId}:`, error.message);
        errors.push({
          landId: land.landId,
          _id: land._id,
          error: error.message,
          success: false,
        });
      }
    }

    console.log('\n--- Bulk Pinning Complete ---');
    console.log(`Successfully pinned: ${results.length}`);
    console.log(`Failed: ${errors.length}`);
    console.log('------------------------------');

    return NextResponse.json({
      success: true,
      message: `Bulk pinning completed: ${results.length} successful, ${errors.length} failed`,
      pinnedCount: results.length,
      failedCount: errors.length,
      totalProcessed: unpinnedLands.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Error in bulk pinning:', error);
    return NextResponse.json(
      { error: 'Failed to bulk pin land metadata', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lands/pin-all
 * Get pinning status for all user's lands
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Get all lands owned by the user
    const allLands = await Land.find({ ownerClerkId: userId });

    const pinnedLands = allLands.filter(land => land.ipfsCid);
    const unpinnedLands = allLands.filter(land => !land.ipfsCid);

    const pinnedDetails = pinnedLands.map(land => ({
      landId: land.landId,
      _id: land._id,
      ipfsCid: land.ipfsCid,
      ipfsUrl: getIPFSGatewayURL(land.ipfsCid!),
    }));

    const unpinnedDetails = unpinnedLands.map(land => ({
      landId: land.landId,
      _id: land._id,
    }));

    return NextResponse.json({
      success: true,
      totalLands: allLands.length,
      pinnedCount: pinnedLands.length,
      unpinnedCount: unpinnedLands.length,
      pinningProgress: allLands.length > 0 
        ? ((pinnedLands.length / allLands.length) * 100).toFixed(2) + '%'
        : '0%',
      pinnedLands: pinnedDetails,
      unpinnedLands: unpinnedDetails,
    });

  } catch (error: any) {
    console.error('Error fetching pinning status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pinning status', details: error.message },
      { status: 500 }
    );
  }
}
