import { ethers } from "ethers";

const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/M7VUB8A44SpkByJp5j162";
const provider = new ethers.JsonRpcProvider(rpcUrl);

const ABI = [
  "function trades(string memory tradeId) external view returns (address buyer, address seller, uint256 tokenId, uint256 price, bool isFunded, bool isNftDeposited, bool isCompleted)"
];

const contract = new ethers.Contract("0x6E15cC0755Cf79c59a22B502a4A3aA36e64E410f", ABI, provider);
contract.trades("TRD-94BB5E04")
  .then(console.log)
  .catch(e => console.error("Error with 7 items ABI:", e.message));

const ABI6 = [
  "function trades(string memory tradeId) external view returns (address buyer, address seller, uint256 tokenId, uint256 price, bool isFunded, bool isCompleted)"
];
const contract6 = new ethers.Contract("0x6E15cC0755Cf79c59a22B502a4A3aA36e64E410f", ABI6, provider);
contract6.trades("TRD-94BB5E04")
  .then(res => console.log("ABI6 output:", res))
  .catch(e => console.error("Error with 6 items ABI:", e.message));
