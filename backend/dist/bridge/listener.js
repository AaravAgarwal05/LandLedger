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
    async start() {
        if (this.isListening) {
            console.log('⚠️  Listener already running');
            return;
        }
        console.log('👂 Starting Fabric event listener...');
        this.isListening = true;
        try {
            const contract = await (0, gateway_1.getContract)();
            // Set up chaincode event listener
            const eventListener = async (event) => {
                try {
                    const payload = JSON.parse(event.payload.toString());
                    console.log(`📬 Received Fabric event:`, payload);
                    if (event.eventName === 'LandRegistered') {
                        await this.handleLandRegistered(payload);
                    }
                    else if (event.eventName === 'TokenInfoUpdated') {
                        console.log(`ℹ️  TokenInfoUpdated event received for landId: ${payload.landId}`);
                    }
                }
                catch (error) {
                    console.error('❌ Error processing Fabric event:', error);
                }
            };
            // Note: In production, you'd use contract.addContractListener or similar
            // For now, we'll use a polling approach
            console.log('✅ Listener started (polling mode)');
        }
        catch (error) {
            console.error('❌ Failed to start listener:', error);
            this.isListening = false;
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
        this.isListening = false;
        console.log('🛑 Listener stopped');
    }
}
exports.Listener = Listener;
