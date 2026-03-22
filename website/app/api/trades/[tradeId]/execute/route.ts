import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { TradeRequest } from '@/models/TradeRequest';
import { Notification } from '@/models/Notification';
import { NFTToken } from '@/models/NFTToken';
import { Land } from '@/models/Land';
import { Transaction } from '@/models/Transaction';
import { Message } from '@/models/Message';
import { ethers } from 'ethers';
import { LAND_ESCROW_ABI } from '@/lib/contracts/abis';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request, { params }: { params: Promise<{ tradeId: string }> | { tradeId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // Body might be empty
    }
    const { escrowAddress } = body as any;

    const resolvedParams = await params;
    const tradeId = resolvedParams.tradeId;

    await dbConnect();

    const trade = await TradeRequest.findOne({ tradeId });
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // Set up Ethers provider and Relayer wallet (server-side)
    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.RELAYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'Server relayer private key is not configured' }, { status: 500 });
    }
    const adminWallet = new ethers.Wallet(privateKey, provider);

    const targetEscrow = escrowAddress || trade.escrowContractAddress || process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;

    if (!targetEscrow) {
        return NextResponse.json({ error: 'Escrow contract address not found' }, { status: 400 });
    }

    const escrowContract = new ethers.Contract(targetEscrow, LAND_ESCROW_ABI, adminWallet);

    // Verify on-chain state
    const onChainTrade = await escrowContract.trades(tradeId);
    if (!onChainTrade.isFunded || !onChainTrade.isNftDeposited) {
        return NextResponse.json({ error: 'Trade assets are not fully deposited on-chain yet' }, { status: 400 });
    }

    // Execute the atomic swap on-chain
    const tx = await escrowContract.executeTrade(tradeId);
    const receipt = await tx.wait();

    // ──────────────────────────────────────────────────────── 
    // SYNC DATABASE STATE AFTER SUCCESSFUL ON-CHAIN EXECUTION
    // ──────────────────────────────────────────────────────── 

    // 1. Update Trade record
    trade.status = 'executed';
    trade.txHash = tx.hash;
    if (escrowAddress) trade.escrowContractAddress = escrowAddress;
    await trade.save();

    // 2. Update NFT ownership → buyer
    const nft = await NFTToken.findOne({ landId: trade.landId });
    if (nft) {
      nft.provenance.push({
        action: 'transfer',
        txHash: tx.hash,
        timestamp: new Date(),
        from: trade.sellerWallet?.toLowerCase(),
        to: trade.buyerWallet?.toLowerCase(),
        note: `Atomic swap via trade ${tradeId}`,
      });
      nft.ownerWallet = trade.buyerWallet?.toLowerCase();
      await nft.save();
    }

    // 3. Update Land ownership → buyer
    const land = await Land.findOne({ landId: trade.landId });
    if (land) {
      land.ownerClerkId = trade.buyerClerkId;
      land.ownerWallet = trade.buyerWallet?.toLowerCase();
      (land as any).statusHistory?.push({
        status: 'minted',
        changedAt: new Date(),
        changedBy: trade.buyerClerkId,
        notes: `Ownership transferred via trade ${tradeId} (tx: ${tx.hash})`,
      });
      await land.save();
    }

    // 4. Record Transaction in DB
    await Transaction.create({
      type: 'evm',
      relatedId: tradeId,
      txHash: tx.hash,
      network: 'sepolia',
      from: trade.sellerWallet?.toLowerCase(),
      to: trade.buyerWallet?.toLowerCase(),
      status: 'confirmed',
      confirmedAt: new Date(),
      raw: {
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        escrowAddress: targetEscrow,
      },
    });

    // 5. Post final chat log
    await Message.create({
      tradeId,
      senderClerkId: 'system',
      senderRole: 'system',
      content: `🎉 Trade Complete! NFT transferred to buyer. Funds sent to seller. Tx: ${tx.hash}`,
      isSystemMessage: true,
      type: 'on_chain_action',
    });

    // 6. Notify participants
    await Notification.insertMany([
      {
        userId: trade.buyerClerkId,
        type: 'trade_update',
        title: '🎉 Trade Executed — NFT Transferred!',
        message: `Your trade ${tradeId} was completed. You are now the owner of land ${trade.landId}!`,
        link: `/trades/${tradeId}`
      },
      {
        userId: trade.sellerClerkId,
        type: 'trade_update',
        title: '💰 Trade Executed — Funds Received!',
        message: `Your trade ${tradeId} was completed. Funds have been sent to your wallet!`,
        link: `/trades/${tradeId}`
      }
    ]);

    return NextResponse.json({ success: true, message: 'Trade executed successfully', txHash: tx.hash });
  } catch (error: any) {
    console.error('Error executing trade via relayer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

