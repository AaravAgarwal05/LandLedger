/*
 * Fabric Chaincode (JavaScript) - LandContract
 *
 * This file implements a single Fabric chaincode (contract) that manages land records for LandLedger.
 * It uses the fabric-contract-api and exports the LandContract class.
 *
 * Mapped to LandLedger Land Schema:
 * - landId: Unique identifier
 * - ownerWallet: Wallet address (normalized to lowercase)
 * - ownerClerkId: Clerk user ID
 * - ipfsCid: IPFS Content Identifier for metadata
 * - canonicalHash: Data integrity hash
 * - surveyNo: Survey number
 * - status: Lifecycle status
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class LandContract extends Contract {

    constructor() {
        super('LandContract');
    }

    // Helper: build state key
    _landKey(landId) {
        return `LAND:${landId}`;
    }

    // Helper: check existence
    async _exists(ctx, landId) {
        const key = this._landKey(landId);
        const data = await ctx.stub.getState(key);
        return (!!data && data.length > 0);
    }

    // Helper: Get deterministic transaction timestamp
    _getTxDate(ctx) {
        const timestamp = ctx.stub.getTxTimestamp();
        // Convert Protobuf timestamp to ISO string
        // timestamp.seconds is Long (low/high), timestamp.nanos is number
        const milliseconds = (timestamp.seconds.low * 1000) + (timestamp.nanos / 1000000);
        return new Date(milliseconds).toISOString();
    }

    /**
     * Register a new land record.
     * @param {Context} ctx - The transaction context
     * @param {String} landJson - JSON string containing land details
     */
    async RegisterLand(ctx, landJson) {
        if (!landJson) {
            throw new Error('RegisterLand requires a JSON string argument');
        }

        let land;
        try {
            land = JSON.parse(landJson);
        } catch (err) {
            throw new Error('Invalid JSON provided to RegisterLand');
        }

        // Validate required fields matching MongoDB schema
        if (!land.landId) throw new Error('land.landId is required');
        if (!land.ownerWallet) throw new Error('land.ownerWallet is required');
        if (!land.ownerClerkId) throw new Error('land.ownerClerkId is required');
        if (!land.ipfsCid) throw new Error('land.ipfsCid is required');
        if (!land.canonicalHash) throw new Error('land.canonicalHash is required');

        const landId = land.landId;
        const key = this._landKey(landId);

        // Prevent duplicate
        if (await this._exists(ctx, landId)) {
            throw new Error(`Land ${landId} already exists`);
        }

        // Get submitter ID for history
        const submitter = ctx.clientIdentity ? ctx.clientIdentity.getID() : 'unknown';
        const txDate = this._getTxDate(ctx);

        // Create on-chain state (Minimal public state, relying on IPFS for heavy data)
        const store = {
            docType: 'land', // Useful for CouchDB queries
            landId: land.landId,
            ownerClerkId: land.ownerClerkId,
            ownerWallet: (land.ownerWallet || '').toLowerCase(),
            ipfsCid: land.ipfsCid,
            canonicalHash: land.canonicalHash,
            surveyNo: land.surveyNo || null, // Useful for on-chain verification
            landTitle: land.landTitle || null,
            status: 'fabric_registered', // Initial on-chain status
            createdAt: txDate,
            updatedAt: txDate,
            history: [
                {
                    status: 'fabric_registered',
                    at: txDate,
                    by: submitter,
                    note: 'Initial registration on ledger'
                }
            ]
        };

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(store)));

        // Emit event
        const eventPayload = {
            landId: store.landId,
            ownerWallet: store.ownerWallet,
            ipfsCid: store.ipfsCid,
            canonicalHash: store.canonicalHash
        };
        ctx.stub.setEvent('LandRegistered', Buffer.from(JSON.stringify(eventPayload)));

        return JSON.stringify(store);
    }

    /**
     * Get land by ID
     * @param {Context} ctx 
     * @param {String} landId 
     */
    async GetLand(ctx, landId) {
        if (!landId) throw new Error('GetLand requires landId');
        
        const key = this._landKey(landId);
        const data = await ctx.stub.getState(key);
        
        if (!data || data.length === 0) {
            throw new Error(`Land ${landId} not found`);
        }
        
        return data.toString();
    }

    /**
     * Get all lands (Use with caution on large datasets)
     * @param {Context} ctx 
     */
    async GetAllLands(ctx) {
        // Range query for all keys starting with LAND:
        const iterator = await ctx.stub.getStateByRange('LAND:', 'LAND:~');
        const all = [];
        
        let res = await iterator.next();
        while (!res.done) {
            const str = res.value.value.toString('utf8');
            try {
                all.push(JSON.parse(str));
            } catch (e) {
                all.push(str);
            }
            res = await iterator.next();
        }
        await iterator.close();
        
        return JSON.stringify(all);
    }

    /**
     * Update token info after NFT is minted on EVM network
     * @param {Context} ctx 
     * @param {String} landId 
     * @param {String} tokenAddress 
     * @param {String} tokenId 
     * @param {String} mintTxHash 
     */
    async UpdateTokenInfo(ctx, landId, tokenAddress, tokenId, mintTxHash) {
        if (!landId) throw new Error('landId required');
        
        const key = this._landKey(landId);
        const data = await ctx.stub.getState(key);
        
        if (!data || data.length === 0) throw new Error(`Land ${landId} not found`);

        const obj = JSON.parse(data.toString());
        const submitter = ctx.clientIdentity ? ctx.clientIdentity.getID() : 'unknown';
        const txDate = this._getTxDate(ctx);

        obj.tokenAddress = (tokenAddress || '').toLowerCase();
        obj.tokenId = tokenId;
        obj.mintTxHash = mintTxHash || null;
        obj.status = 'minted';
        obj.updatedAt = txDate;
        
        obj.history = obj.history || [];
        obj.history.push({
            status: 'minted',
            at: txDate,
            by: submitter,
            note: `Minted NFT ${tokenId} at ${tokenAddress}`
        });

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(obj)));

        ctx.stub.setEvent('TokenInfoUpdated', Buffer.from(JSON.stringify({ landId, tokenAddress, tokenId })));
        return JSON.stringify(obj);
    }

    /**
     * Transfer on-chain ownership
     * @param {Context} ctx 
     * @param {String} landId 
     * @param {String} newOwnerWallet 
     * @param {String} newOwnerClerkId 
     */
    async TransferLand(ctx, landId, newOwnerWallet, newOwnerClerkId) {
        if (!landId) throw new Error('landId required');
        if (!newOwnerWallet) throw new Error('newOwnerWallet required');

        const key = this._landKey(landId);
        const data = await ctx.stub.getState(key);
        
        if (!data || data.length === 0) throw new Error(`Land ${landId} not found`);

        const obj = JSON.parse(data.toString());
        const submitter = ctx.clientIdentity ? ctx.clientIdentity.getID() : 'unknown';
        const txDate = this._getTxDate(ctx);
        
        const prev = {
            ownerWallet: obj.ownerWallet,
            ownerClerkId: obj.ownerClerkId
        };

        obj.ownerWallet = newOwnerWallet.toLowerCase();
        if (newOwnerClerkId) obj.ownerClerkId = newOwnerClerkId;
        
        obj.updatedAt = txDate;
        obj.history = obj.history || [];
        obj.history.push({
            status: 'transferred', // Action type
            at: txDate,
            by: submitter,
            from: prev,
            to: { ownerWallet: obj.ownerWallet, ownerClerkId: obj.ownerClerkId }
        });

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(obj)));

        ctx.stub.setEvent('LandTransferred', Buffer.from(JSON.stringify({
            landId,
            from: prev,
            to: { ownerWallet: obj.ownerWallet, ownerClerkId: obj.ownerClerkId }
        })));
        
        return JSON.stringify(obj);
    }

    /**
     * Subdivide a parent land into child lands
     * @param {Context} ctx 
     * @param {String} parentId 
     * @param {String} childrenJsonArray 
     */
    async SubdivideLand(ctx, parentId, childrenJsonArray) {
        if (!parentId) throw new Error('parentId required');
        if (!childrenJsonArray) throw new Error('childrenJsonArray required (JSON array string)');

        const parentKey = this._landKey(parentId);
        const parentData = await ctx.stub.getState(parentKey);
        
        if (!parentData || parentData.length === 0) throw new Error(`Parent land ${parentId} not found`);

        let children;
        try {
            children = JSON.parse(childrenJsonArray);
            if (!Array.isArray(children)) throw new Error('childrenJsonArray must be JSON array');
        } catch (e) {
            throw new Error('Invalid childrenJsonArray JSON');
        }

        const submitter = ctx.clientIdentity ? ctx.clientIdentity.getID() : 'unknown';
        const txDate = this._getTxDate(ctx);

        // Create each child
        for (const child of children) {
            if (!child.landId) throw new Error('Each child must have landId');
            
            const ck = this._landKey(child.landId);
            if (await this._exists(ctx, child.landId)) {
                throw new Error(`Child land ${child.landId} already exists`);
            }

            const store = {
                docType: 'land',
                landId: child.landId,
                parentId: parentId,
                ownerClerkId: child.ownerClerkId || null,
                ownerWallet: (child.ownerWallet || '').toLowerCase(),
                ipfsCid: child.ipfsCid || null,
                canonicalHash: child.canonicalHash || null,
                surveyNo: child.surveyNo || null,
                status: 'fabric_registered',
                createdAt: txDate,
                updatedAt: txDate,
                history: [
                    {
                        status: 'fabric_registered',
                        at: txDate,
                        by: submitter,
                        note: `Subdivided from ${parentId}`
                    }
                ]
            };
            
            await ctx.stub.putState(ck, Buffer.from(JSON.stringify(store)));
            
            // Emit child created event
            ctx.stub.setEvent('LandRegistered', Buffer.from(JSON.stringify({
                landId: store.landId,
                parentId: parentId
            })));
        }

        // Retire parent
        const parentObj = JSON.parse(parentData.toString());
        parentObj.status = 'subdivided'; // Using 'subdivided' instead of 'retired' to be more specific
        parentObj.updatedAt = txDate;
        parentObj.childrenIds = children.map(c => c.landId);
        
        parentObj.history = parentObj.history || [];
        parentObj.history.push({
            status: 'subdivided',
            at: txDate,
            by: submitter,
            children: parentObj.childrenIds
        });

        await ctx.stub.putState(parentKey, Buffer.from(JSON.stringify(parentObj)));
        
        ctx.stub.setEvent('LandSubdivided', Buffer.from(JSON.stringify({
            parentId,
            children: parentObj.childrenIds
        })));

        return JSON.stringify({
            parent: parentObj,
            children: children.map(c => c.landId)
        });
    }

    /**
     * Mark a land retired (de-register)
     * @param {Context} ctx 
     * @param {String} landId 
     */
    async RetireLand(ctx, landId) {
        if (!landId) throw new Error('landId required');
        
        const key = this._landKey(landId);
        const data = await ctx.stub.getState(key);
        
        if (!data || data.length === 0) throw new Error(`Land ${landId} not found`);

        const obj = JSON.parse(data.toString());
        const submitter = ctx.clientIdentity ? ctx.clientIdentity.getID() : 'unknown';
        const txDate = this._getTxDate(ctx);

        obj.status = 'retired';
        obj.updatedAt = txDate;
        
        obj.history = obj.history || [];
        obj.history.push({
            status: 'retired',
            at: txDate,
            by: submitter
        });

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(obj)));
        
        ctx.stub.setEvent('LandRetired', Buffer.from(JSON.stringify({ landId })));
        return JSON.stringify(obj);
    }

    /**
     * Raise a dispute
     * @param {Context} ctx 
     * @param {String} landId 
     * @param {String} reason 
     */
    async RaiseDispute(ctx, landId, reason) {
        if (!landId) throw new Error('landId required');
        if (!reason) throw new Error('reason required');

        const key = this._landKey(landId);
        const data = await ctx.stub.getState(key);
        
        if (!data || data.length === 0) throw new Error(`Land ${landId} not found`);

        const obj = JSON.parse(data.toString());
        const submitter = ctx.clientIdentity ? ctx.clientIdentity.getID() : 'unknown';
        const txDate = this._getTxDate(ctx);

        obj.status = 'disputed';
        obj.dispute = {
            reason,
            createdAt: txDate,
            by: submitter
        };
        obj.updatedAt = txDate;
        
        obj.history = obj.history || [];
        obj.history.push({
            status: 'disputed',
            at: txDate,
            by: submitter,
            reason
        });

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(obj)));
        
        ctx.stub.setEvent('DisputeRaised', Buffer.from(JSON.stringify({ landId, reason })));
        return JSON.stringify(obj);
    }

    /**
     * Resolve dispute
     * @param {Context} ctx 
     * @param {String} landId 
     * @param {String} resolution 
     */
    async ResolveDispute(ctx, landId, resolution) {
        if (!landId) throw new Error('landId required');
        if (!resolution) throw new Error('resolution required');

        const key = this._landKey(landId);
        const data = await ctx.stub.getState(key);
        
        if (!data || data.length === 0) throw new Error(`Land ${landId} not found`);

        const obj = JSON.parse(data.toString());
        const submitter = ctx.clientIdentity ? ctx.clientIdentity.getID() : 'unknown';
        const txDate = this._getTxDate(ctx);

        // Revert to previous status or set to 'fabric_registered'/'minted' depending on logic
        // For now, we'll set it to 'resolved' which implies it's active again but has a resolution record
        obj.status = 'resolved'; 
        
        obj.dispute = obj.dispute || {};
        obj.dispute.resolution = resolution;
        obj.dispute.resolvedAt = txDate;
        
        obj.updatedAt = txDate;
        
        obj.history = obj.history || [];
        obj.history.push({
            status: 'resolved',
            at: txDate,
            by: submitter,
            resolution
        });

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(obj)));
        
        ctx.stub.setEvent('DisputeResolved', Buffer.from(JSON.stringify({ landId, resolution })));
        return JSON.stringify(obj);
    }
}

module.exports = LandContract;
