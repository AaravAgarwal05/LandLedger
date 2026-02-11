/*
 * Unit tests for LandContract
 * Uses Mocha, Chai, and Sinon to mock Fabric context
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { createRequire } from 'module';

// Use createRequire to import CommonJS modules in ES module environment
const require = createRequire(import.meta.url);
const LandContract = require('../lib/landContract.js');
const { Context } = require('fabric-contract-api');
const { ChaincodeStub } = require('fabric-shim');

describe('LandContract', () => {
    let contract;
    let ctx;
    let mockStub;

    // Sample data replicating MongoDB schema structure
    const sampleLand = {
        landId: 'L-2025-MUM-MA-ABC12',
        ownerWallet: '0x1234567890abcdef1234567890abcdef12345678',
        ownerClerkId: 'user_2abc123xyz',
        landTitle: 'Prime Agricultural Land',
        surveyNo: '123/A',
        area: 1000,
        areaUnit: 'sqm',
        address: {
            plotNo: '45',
            street1: 'Main Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001'
        },
        ipfsCid: 'bafkreiabcd1234efgh5678ijkl9012mnop3456qrst7890uvwx',
        canonicalHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
        status: 'registered',
        fabricTxId: 'FABRIC-1234567890',
        notes: 'Test land record'
    };

    beforeEach(() => {
        contract = new LandContract();
        ctx = sinon.createStubInstance(Context);
        mockStub = sinon.createStubInstance(ChaincodeStub);
        ctx.stub = mockStub;
        
        // Mock client identity
        ctx.clientIdentity = {
            getID: sinon.stub().returns('x509::CN=Admin,OU=client,O=Hyperledger,ST=North Carolina,C=US::CN=ca.org1.example.com,O=org1.example.com,L=Durham,ST=North Carolina,C=US')
        };
    });

    describe('RegisterLand', () => {
        it('should register a new land with correct fields', async () => {
            // Mock getState to return null (land doesn't exist)
            mockStub.getState.resolves(null);

            const result = await contract.RegisterLand(ctx, JSON.stringify(sampleLand));
            const storedLand = JSON.parse(result);

            // Verify stored fields match expected schema mapping
            expect(storedLand.landId).to.equal(sampleLand.landId);
            expect(storedLand.ownerWallet).to.equal(sampleLand.ownerWallet.toLowerCase());
            expect(storedLand.ownerClerkId).to.equal(sampleLand.ownerClerkId);
            expect(storedLand.ipfsCid).to.equal(sampleLand.ipfsCid);
            expect(storedLand.canonicalHash).to.equal(sampleLand.canonicalHash);
            expect(storedLand.status).to.equal('fabric_registered');
            
            // Verify putState was called
            sinon.assert.calledOnce(mockStub.putState);
            const [key, value] = mockStub.putState.firstCall.args;
            expect(key).to.equal(`LAND:${sampleLand.landId}`);
            
            // Verify event was emitted
            sinon.assert.calledWith(mockStub.setEvent, 'LandRegistered', sinon.match.any);
        });

        it('should throw error if land already exists', async () => {
            // Mock getState to return existing data
            mockStub.getState.resolves(Buffer.from(JSON.stringify(sampleLand)));

            try {
                await contract.RegisterLand(ctx, JSON.stringify(sampleLand));
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.include('already exists');
            }
        });

        it('should throw error if required fields are missing', async () => {
            const invalidLand = { ...sampleLand };
            delete invalidLand.ownerWallet;

            try {
                await contract.RegisterLand(ctx, JSON.stringify(invalidLand));
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.include('ownerWallet is required');
            }
        });
    });

    describe('GetLand', () => {
        it('should retrieve an existing land', async () => {
            mockStub.getState.resolves(Buffer.from(JSON.stringify(sampleLand)));

            const result = await contract.GetLand(ctx, sampleLand.landId);
            const retrievedLand = JSON.parse(result);

            expect(retrievedLand.landId).to.equal(sampleLand.landId);
        });

        it('should throw error if land not found', async () => {
            mockStub.getState.resolves(null);

            try {
                await contract.GetLand(ctx, 'NON-EXISTENT');
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.include('not found');
            }
        });
    });

    describe('UpdateTokenInfo', () => {
        it('should update token info and status', async () => {
            // Setup existing land
            const existingLand = { ...sampleLand, status: 'fabric_registered' };
            mockStub.getState.resolves(Buffer.from(JSON.stringify(existingLand)));

            const tokenAddress = '0xTokenAddress';
            const tokenId = '101';
            const mintTxHash = '0xMintHash';

            const result = await contract.UpdateTokenInfo(ctx, sampleLand.landId, tokenAddress, tokenId, mintTxHash);
            const updatedLand = JSON.parse(result);

            expect(updatedLand.tokenAddress).to.equal(tokenAddress.toLowerCase());
            expect(updatedLand.tokenId).to.equal(tokenId);
            expect(updatedLand.status).to.equal('minted');
            expect(updatedLand.history).to.have.lengthOf(1); // Assuming initial history wasn't in mock
            
            sinon.assert.calledWith(mockStub.setEvent, 'TokenInfoUpdated', sinon.match.any);
        });
    });

    describe('SubdivideLand', () => {
        it('should subdivide parent and create children', async () => {
            // Setup parent
            const parentId = sampleLand.landId;
            mockStub.getState.withArgs(`LAND:${parentId}`).resolves(Buffer.from(JSON.stringify(sampleLand)));
            
            // Setup children
            const children = [
                {
                    landId: 'L-CHILD-1',
                    ownerWallet: sampleLand.ownerWallet,
                    ownerClerkId: sampleLand.ownerClerkId,
                    ipfsCid: 'cid-child-1',
                    canonicalHash: 'hash-child-1'
                },
                {
                    landId: 'L-CHILD-2',
                    ownerWallet: sampleLand.ownerWallet,
                    ownerClerkId: sampleLand.ownerClerkId,
                    ipfsCid: 'cid-child-2',
                    canonicalHash: 'hash-child-2'
                }
            ];
            
            // Mock children not existing
            mockStub.getState.withArgs('LAND:L-CHILD-1').resolves(null);
            mockStub.getState.withArgs('LAND:L-CHILD-2').resolves(null);

            const result = await contract.SubdivideLand(ctx, parentId, JSON.stringify(children));
            const response = JSON.parse(result);

            // Verify parent retired
            expect(response.parent.status).to.equal('subdivided');
            expect(response.parent.childrenIds).to.have.members(['L-CHILD-1', 'L-CHILD-2']);

            // Verify children created (putState called 3 times: 2 children + 1 parent update)
            sinon.assert.callCount(mockStub.putState, 3);
            
            // Verify events
            sinon.assert.calledWith(mockStub.setEvent, 'LandSubdivided', sinon.match.any);
        });
    });
});
