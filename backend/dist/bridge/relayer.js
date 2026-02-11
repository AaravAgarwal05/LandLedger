"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Relayer = void 0;
const ethers_1 = require("ethers");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// Load contract ABI
async function loadContractABI() {
    const artifactPath = path_1.default.join(__dirname, '../../..', 'hardhat', 'artifacts', 'contracts', 'LandNFT.sol', 'LandNFT.json');
    const artifact = JSON.parse(await promises_1.default.readFile(artifactPath, 'utf8'));
    return artifact.abi;
}
class Relayer {
    constructor() {
        const rpcUrl = process.env.SEPOLIA_RPC_URL;
        const privateKey = process.env.RELAYER_PRIVATE_KEY;
        this.contractAddress = process.env.NFT_CONTRACT_ADDRESS || '';
        if (!rpcUrl || !privateKey || !this.contractAddress) {
            throw new Error('Missing required environment variables: SEPOLIA_RPC_URL, RELAYER_PRIVATE_KEY, or NFT_CONTRACT_ADDRESS');
        }
        this.provider = new ethers_1.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers_1.Wallet(privateKey, this.provider);
    }
    async initialize() {
        const abi = await loadContractABI();
        this.contract = new ethers_1.Contract(this.contractAddress, abi, this.wallet);
        console.log(`✅ Relayer initialized with contract at ${this.contractAddress}`);
    }
    async mintToOwner(ownerWallet, ipfsCid, landId) {
        try {
            console.log(`🔨 Minting NFT for landId: ${landId}, owner: ${ownerWallet}`);
            const tokenURI = `ipfs://${ipfsCid}`;
            // Call mintTo function on the contract
            const tx = await this.contract.mintTo(ownerWallet, tokenURI);
            console.log(`📤 Transaction sent: ${tx.hash}`);
            // Wait for transaction to be mined
            const receipt = await tx.wait();
            console.log(`✅ Transaction mined in block ${receipt.blockNumber}`);
            // Extract TokenId from the LandMinted event
            const mintEvent = receipt.logs
                .map((log) => {
                try {
                    return this.contract.interface.parseLog(log);
                }
                catch {
                    return null;
                }
            })
                .find((event) => event && event.name === 'LandMinted');
            if (!mintEvent) {
                throw new Error('LandMinted event not found in transaction logs');
            }
            const tokenId = mintEvent.args.tokenId.toString();
            return {
                tokenId,
                txHash: tx.hash,
                contractAddress: this.contractAddress,
            };
        }
        catch (error) {
            console.error(`❌ Minting failed for landId ${landId}:`, error.message);
            throw error;
        }
    }
    async getWalletBalance() {
        const balance = await this.provider.getBalance(this.wallet.address);
        return ethers_1.ethers.formatEther(balance);
    }
    getRelayerAddress() {
        return this.wallet.address;
    }
}
exports.Relayer = Relayer;
