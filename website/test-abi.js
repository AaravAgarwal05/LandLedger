const { ethers } = require("ethers");

const LAND_ESCROW_ABI = [
  "function trades(string memory tradeId) external view returns (address buyer, address seller, uint256 tokenId, uint256 price, bool isFunded, bool isNftDeposited, bool isCompleted)"
];

const CORRECT_ABI = [
  "function trades(string memory tradeId) external view returns (address buyer, address seller, uint256 tokenId, uint256 price, bool isFunded, bool isCompleted)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/M7VUB8A44SpkByJp5j162"); // From .env
  const contractAddress = "0x6E15cC0755Cf79c59a22B502a4A3aA36e64E410f";
  
  try {
    const contract = new ethers.Contract(contractAddress, LAND_ESCROW_ABI, provider);
    const result = await contract.trades("TRD-94BB5E04");
    console.log("With WRONG ABI:", result);
  } catch (e) {
    console.error("WRONG ABI ERROR:", e.message);
  }

  try {
    const correctContract = new ethers.Contract(contractAddress, CORRECT_ABI, provider);
    const result = await correctContract.trades("TRD-94BB5E04");
    console.log("With CORRECT ABI:", result);
  } catch (e) {
    console.error("CORRECT ABI ERROR:", e.message);
  }
}

main();
