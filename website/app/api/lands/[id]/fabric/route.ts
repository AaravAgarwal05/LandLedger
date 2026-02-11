import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Land } from '@/models/Land';
import { submitTransaction } from '@/lib/fabric';

/**
 * POST /api/lands/[id]/fabric
 * Retry registering a land on Hyperledger Fabric
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
        { error: 'You do not have permission to register this land' },
        { status: 403 }
      );
    }

    // Check if IPFS CID exists (prerequisite)
    if (!land.ipfsCid) {
      return NextResponse.json(
        { error: 'Land metadata must be pinned to IPFS before registering on blockchain' },
        { status: 400 }
      );
    }

    // Check if already registered on Fabric
    // Check if already registered on Fabric
    // Only block if status is explicitly 'fabric_registered'
    // This allows retrying if it's stuck in 'pending_fabric_commit' or 'metadata_pinned' even if a txId exists (e.g. from a failed run)
    if (land.fabricTxId && land.status === 'fabric_registered') {
      return NextResponse.json(
        {
          success: true,
          message: 'Land is already registered on blockchain',
          fabricTxId: land.fabricTxId,
        },
        { status: 200 }
      );
    }

    console.log('--- Retrying Blockchain Registration ---');
    console.log(`Land ID: ${land.landId}`);
    console.log(`MongoDB _id: ${land._id}`);

    // Update status to pending_fabric_commit
    land.updateStatus('pending_fabric_commit', userId, 'Manual retry: Submitting transaction to Hyperledger Fabric');
    await land.save();

    try {
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
        history: [], // Chaincode will initialize this
      };

      console.log('📤 Submitting "RegisterLand" transaction...');
      
      // Submit transaction
      const { result: resultJson, txId } = await submitTransaction('RegisterLand', JSON.stringify(landDataForChaincode));
      
      console.log(`✅ Transaction submitted successfully`);
      console.log(`   TxID: ${txId}`);

      // Update MongoDB with Fabric details
      land.fabricTxId = txId;
      land.updateStatus('fabric_registered', userId, `Manual retry successful. TxID: ${txId}`);
      await land.save();

      return NextResponse.json({
        success: true,
        message: 'Land successfully registered on blockchain',
        landId: land.landId,
        fabricTxId: txId,
      });

    } catch (fabricError: any) {
      console.error('❌ Blockchain registration failed:', fabricError.message);
      
      // Revert status
      land.updateStatus('metadata_pinned', userId, `Manual retry failed: ${fabricError.message}`);
      await land.save();

      return NextResponse.json(
        { error: 'Failed to submit transaction to blockchain', details: fabricError.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error retrying blockchain registration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
