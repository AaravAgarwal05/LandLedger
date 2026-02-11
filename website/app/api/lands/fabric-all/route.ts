import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Land } from '@/models/Land';
import { submitTransaction } from '@/lib/fabric';

/**
 * POST /api/lands/fabric-all
 * Bulk retry registering all eligible lands on Hyperledger Fabric
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Find all lands owned by user that have IPFS CID but NO Fabric TxID
    const uncommittedLands = await Land.find({
      ownerClerkId: userId,
      ipfsCid: { $exists: true, $ne: null },
      fabricTxId: { $exists: false },
    });

    if (uncommittedLands.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All pinned lands are already registered on blockchain',
        processedCount: 0,
      });
    }

    console.log('--- Bulk Retrying Blockchain Registration ---');
    console.log(`User: ${userId}`);
    console.log(`Uncommitted lands: ${uncommittedLands.length}`);

    const results = [];
    const errors = [];

    // Process each land sequentially
    for (const land of uncommittedLands) {
      try {
        console.log(`\nProcessing: ${land.landId}`);

        // Prepare data for chaincode
        const landDataForChaincode = {
          landId: land.landId,
          ownerWallet: land.ownerWallet,
          ownerClerkId: land.ownerClerkId,
          ipfsCid: land.ipfsCid,
          canonicalHash: land.canonicalHash,
          surveyNo: land.surveyNo,
          landTitle: land.landTitle,
          status: 'registered', // Initial on-chain status
          createdAt: land.createdAt.toISOString(),
          updatedAt: land.updatedAt.toISOString(),
          history: [],
        };

        // Submit transaction
        const { result: resultJson, txId } = await submitTransaction('RegisterLand', JSON.stringify(landDataForChaincode));

        // Update MongoDB with Fabric details
        land.fabricTxId = txId;
        land.updateStatus('fabric_registered', userId, `Bulk retry successful. TxID: ${txId}`);
        await land.save();

        results.push({
          landId: land.landId,
          _id: land._id,
          fabricTxId: txId,
          success: true,
        });

        console.log(`✅ Successfully registered: ${land.landId} -> ${txId}`);

      } catch (error: any) {
        console.error(`❌ Failed to register ${land.landId}:`, error.message);
        
        // Log failure in history but don't fail the whole batch
        land.updateStatus('metadata_pinned', userId, `Bulk retry failed: ${error.message}`);
        await land.save();

        errors.push({
          landId: land.landId,
          _id: land._id,
          error: error.message,
          success: false,
        });
      }
    }

    console.log('\n--- Bulk Retry Complete ---');
    console.log(`Successfully registered: ${results.length}`);
    console.log(`Failed: ${errors.length}`);
    console.log('---------------------------');

    return NextResponse.json({
      success: true,
      message: `Bulk retry completed: ${results.length} successful, ${errors.length} failed`,
      processedCount: uncommittedLands.length,
      successCount: results.length,
      failureCount: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Error in bulk blockchain retry:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk retry', details: error.message },
      { status: 500 }
    );
  }
}
