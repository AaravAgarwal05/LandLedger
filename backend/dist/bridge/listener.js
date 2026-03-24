"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Listener = void 0;
const gateway_1 = require("../fabric/gateway");
const NFTToken_1 = require("../db/models/NFTToken");
const Land_1 = require("../db/models/Land");
class Listener {
    constructor() {
        this.isListening = false;
    }
    async start(pollIntervalMs = 30000) {
        if (this.isListening) {
            console.log('⚠️  Listener already running');
            return;
        }
        console.log(`👂 Starting Fabric event listener (polling every ${pollIntervalMs}ms)...`);
        this.isListening = true;
        try {
            // 1. Run initial sync
            await this.syncMissedLands();
            // 2. Start periodic polling
            this.intervalId = setInterval(async () => {
                await this.syncMissedLands();
            }, pollIntervalMs);
            const contract = await (0, gateway_1.getContract)();
            console.log('✅ Listener started (Polling mode active)');
        }
        catch (error) {
            console.error('❌ Failed to start listener:', error);
            this.isListening = false;
        }
    }
    async syncMissedLands() {
        try {
            console.log('🔄 Syncing missed lands...');
            // Find all lands that are registered on Fabric but don't have an NFTToken record
            // We look for status 'fabric_registered' or 'mint_failed' and ensure ipfsCid exists
            const lands = await Land_1.Land.find({
                status: { $in: ['fabric_registered', 'mint_failed'] },
                ipfsCid: { $exists: true, $ne: '' }
            });
            console.log(`🔎 Found ${lands.length} fabric_registered/mint_failed lands to check`);
            for (const land of lands) {
                // Check if NFTToken exists
                const existingToken = await NFTToken_1.NFTToken.findOne({ landId: land.landId });
                if (!existingToken) {
                    console.log(`➕ Queueing missed land ${land.landId} for minting`);
                    const nftToken = new NFTToken_1.NFTToken({
                        landId: land.landId,
                        ownerWallet: land.ownerWallet.toLowerCase(),
                        ipfsCid: land.ipfsCid,
                        status: 'ready_to_mint',
                    });
                    await nftToken.save();
                }
                else if (existingToken.status === 'mint_failed') {
                    console.log(`🔄 Retrying failed mint for land ${land.landId}`);
                    existingToken.status = 'ready_to_mint';
                    existingToken.error = undefined; // Clear previous error
                    await existingToken.save();
                }
            }
            console.log('✅ Sync complete');
        }
        catch (error) {
            console.error('❌ Sync failed:', error);
        }
    }
    async handleLandRegistered(payload) {
        try {
            console.log(`🏞️  Processing LandRegistered event for ${payload.landId}`);
            // 1. Query MongoDB for the land
            const land = await Land_1.Land.findOne({ landId: payload.landId });
            if (!land) {
                console.error(`❌ Land ${payload.landId} not found in MongoDB`);
                return;
            }
            // 2. Validate IPFS CID exists
            if (!land.ipfsCid) {
                console.error(`❌ Land ${payload.landId} missing IPFS CID`);
                return;
            }
            // 3. Check if NFTToken already exists
            const existingToken = await NFTToken_1.NFTToken.findOne({ landId: payload.landId });
            if (existingToken) {
                console.log(`⚠️  NFTToken already exists for ${payload.landId}, skipping`);
                return;
            }
            // 4. Create NFTToken doc with status 'ready_to_mint'
            const nftToken = new NFTToken_1.NFTToken({
                landId: payload.landId,
                ownerWallet: payload.ownerWallet.toLowerCase(),
                ipfsCid: land.ipfsCid,
                status: 'ready_to_mint',
            });
            await nftToken.save();
            console.log(`✅ Created NFTToken for ${payload.landId} with status: ready_to_mint`);
        }
        catch (error) {
            console.error(`❌ Error handling LandRegistered event:`, error);
        }
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.isListening = false;
        console.log('🛑 Listener stopped');
    }
}
exports.Listener = Listener;
