import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("🚀 Deploying LandNFT contract...");
  
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.RELAYER_PRIVATE_KEY;

  console.log("Debug: Checking environment variables...");
  console.log("SEPOLIA_RPC_URL:", rpcUrl ? "Loaded ✅" : "Missing ❌");
  if (rpcUrl) {
    console.log("RPC URL Host:", new URL(rpcUrl).host);
    console.log("RPC URL Path:", new URL(rpcUrl).pathname.split('/')[1]); // Should be v2 or similar
  }
  console.log("RELAYER_PRIVATE_KEY:", privateKey ? "Loaded ✅" : "Missing ❌");

  if (!rpcUrl || !privateKey) {
    throw new Error("Missing SEPOLIA_RPC_URL or RELAYER_PRIVATE_KEY in .env.local");
  }

  // Setup Provider and Wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const network = await provider.getNetwork();
  console.log(`🌍 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log("🔑 Deploying with account:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Balance is 0. Please check if RELAYER_PRIVATE_KEY corresponds to the wallet with funds.");
  }

  // Load Artifacts
  const artifactPath = path.join(__dirname, "../artifacts/contracts/LandNFT.sol/LandNFT.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Artifacts not found. Run 'npx hardhat compile' first.");
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Deploy
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  
  console.log("⏳ Waiting for deployment transaction to be mined...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ LandNFT deployed to:", contractAddress);

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    chainId: (await provider.getNetwork()).chainId.toString(),
    contractAddress: contractAddress,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, 'sepolia.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("📝 Deployment info saved to:", deploymentFile);
  console.log("\n👉 Copy this address to your backend .env file as NFT_CONTRACT_ADDRESS");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
