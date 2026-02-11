"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Processor = void 0;
const NFTToken_1 = require("../db/models/NFTToken");
const Land_1 = require("../db/models/Land");
const gateway_1 = require("../fabric/gateway");
class Processor {
    constructor(relayer) {
        this.isProcessing = false;
        this.relayer = relayer;
    }
    async start(pollIntervalMs = 30000) {
        if (this.isProcessing) {
            console.log('⚠️  Processor already running');
            return;
        }
        console.log(`⚙️  Starting Processor (polling every ${pollIntervalMs}ms)...`);
        this.isProcessing = true;
        // Run immediately, then on interval
        await this.processQueue();
        this.intervalId = setInterval(async () => {
            await this.processQueue();
        }, pollIntervalMs);
        console.log('✅ Processor started');
    }
    async processQueue() {
        try {
            // Find all NFTTokens with status 'ready_to_mint'
            const tokensToMint = await NFTToken_1.NFTToken.find({ status: 'ready_to_mint' }).limit(10);
            if (tokensToMint.length === 0) {
                console.log('📭 No tokens ready to mint');
                return;
            }
            console.log(`📦 Found ${tokensToMint.length} token(s) ready to mint`);
            for (const token of tokensToMint) {
                await this.processToken(token);
            }
        }
        catch (error) {
            console.error('❌ Error in processQueue:', error);
        }
    }
    async processToken(token) {
        try {
            console.log(`🔄 Processing token for landId: ${token.landId}`);
            // 1. Atomically set status to 'minting'
            const updated = await NFTToken_1.NFTToken.findOneAndUpdate({ _id: token._id, status: 'ready_to_mint' }, { $set: { status: 'minting' } }, { new: true });
            if (!updated) {
                console.log(`⚠️  Token ${token.landId} already being processed`);
                return;
            }
            // 2. Call relayer to mint
            const { tokenId, txHash, contractAddress } = await this.relayer.mintToOwner(token.ownerWallet, token.ipfsCid, token.landId);
            console.log(`✅ Minted NFT #${tokenId} on ${contractAddress} (tx: ${txHash})`);
            // 3. Update NFTToken doc
            token.tokenId = tokenId;
            token.tokenAddress = contractAddress;
            token.mintTxHash = txHash;
            token.network = 'sepolia';
            token.tokenURI = `ipfs://${token.ipfsCid}`;
            token.status = 'minted';
            token.mintedAt = new Date();
            await token.save();
            // 4. Update Land doc
            await Land_1.Land.findOneAndUpdate({ landId: token.landId }, { $set: { status: 'minted' } });
            // 5. Update Fabric world-state
            await (0, gateway_1.submitTransaction)('UpdateTokenInfo', token.landId, contractAddress, tokenId, txHash);
            console.log(`✅ Updated Fabric world-state for landId: ${token.landId}`);
        }
        catch (error) {
            console.error(`❌ Failed to mint token for ${token.landId}:`, error.message);
            // Update token status to 'mint_failed' with error message
            token.status = 'mint_failed';
            token.error = error.message;
            await token.save();
            // Update Land status
            await Land_1.Land.findOneAndUpdate({ landId: token.landId }, { $set: { status: 'mint_failed' } });
        }
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.isProcessing = false;
        console.log('🛑 Processor stopped');
    }
}
exports.Processor = Processor;
