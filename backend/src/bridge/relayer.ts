import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers';
import fs from 'fs/promises';
import path from 'path';

// Load contract ABI
async function loadContractABI() {
  const artifactPath = path.join(__dirname, '../../..', 'hardhat', 'artifacts', 'contracts', 'LandNFT.sol', 'LandNFT.json');
  const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
  return artifact.abi;
}

export class Relayer {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private contract!: Contract; // Definitely assigned in initialize()
  private contractAddress: string;

  constructor() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    this.contractAddress = process.env.NFT_CONTRACT_ADDRESS || '';

    if (!rpcUrl || !privateKey || !this.contractAddress) {
      throw new Error('Missing required environment variables: SEPOLIA_RPC_URL, RELAYER_PRIVATE_KEY, or NFT_CONTRACT_ADDRESS');
    }

    this.provider = new JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);
  }

  async initialize() {
    const abi = await loadContractABI();
    this.contract = new Contract(this.contractAddress, abi, this.wallet);
    console.log(`✅ Relayer initialized with contract at ${this.contractAddress}`);
  }

  async mintToOwner(ownerWallet: string, ipfsCid: string, landId: string): Promise<{ tokenId: string; txHash: string; contractAddress: string }> {
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
        .map((log: any) => {
          try {
            return this.contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'LandMinted');

      if (!mintEvent) {
        throw new Error('LandMinted event not found in transaction logs');
      }

      const tokenId = mintEvent.args.tokenId.toString();

      return {
        tokenId,
        txHash: tx.hash,
        contractAddress: this.contractAddress,
      };
    } catch (error: any) {
      console.error(`❌ Minting failed for landId ${landId}:`, error.message);
      throw error;
    }
  }

  async getWalletBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  getRelayerAddress(): string {
    return this.wallet.address;
  }
}
