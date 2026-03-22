/**
 * Deploy only the LandEscrow contract, pointing to an EXISTING LandNFT contract.
 * Use this when you already have a deployed NFT contract and just need a fresh Escrow.
 *
 * Usage:
 *   node scripts/deploy-escrow-only.js
 * or:
 *   npx hardhat run scripts/deploy-escrow-only.js --network sepolia
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// 👇 SET THIS TO YOUR EXISTING LandNFT CONTRACT ADDRESS
const EXISTING_NFT_CONTRACT = "0x0A795E54e13927520A96457da763986834800bA7";
// ============================================================

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.RELAYER_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("Missing SEPOLIA_RPC_URL or RELAYER_PRIVATE_KEY in .env.local");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const network = await provider.getNetwork();
  console.log(`🌍 Connected to: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`🔑 Deploying with: ${wallet.address}`);
  console.log(`🔗 Using existing LandNFT at: ${EXISTING_NFT_CONTRACT}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  // Load the LandEscrow artifact
  const escrowArtifactPath = path.join(__dirname, "../artifacts/contracts/LandEscrow.sol/LandEscrow.json");
  if (!fs.existsSync(escrowArtifactPath)) {
    throw new Error("Escrow artifacts not found. Run 'npx hardhat compile' first.");
  }
  const escrowArtifact = JSON.parse(fs.readFileSync(escrowArtifactPath, "utf8"));

  console.log("🚀 Deploying LandEscrow...");
  const escrowFactory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, wallet);
  const escrowContract = await escrowFactory.deploy(EXISTING_NFT_CONTRACT);

  console.log("⏳ Waiting for LandEscrow to be mined...");
  await escrowContract.waitForDeployment();
  const escrowAddress = await escrowContract.getAddress();
  console.log(`✅ LandEscrow deployed to: ${escrowAddress}`);
  console.log("");
  console.log("Now update your website/.env.local:");
  console.log(`  NEXT_PUBLIC_NFT_CONTRACT=${EXISTING_NFT_CONTRACT}`);
  console.log(`  NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);

  // Save deployment info
  const deploymentFile = path.join(__dirname, '..', 'deployments', 'sepolia-escrow.json');
  fs.writeFileSync(deploymentFile, JSON.stringify({
    network: "sepolia",
    nftContract: EXISTING_NFT_CONTRACT,
    escrowAddress,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
  }, null, 2));
  console.log(`\n📝 Saved to: ${deploymentFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
