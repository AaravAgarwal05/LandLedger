export const LAND_ESCROW_ABI = [
  "function depositFunds(string memory tradeId, address seller, uint256 tokenId) external payable",
  "function depositNFT(string memory tradeId) external",
  "function executeTrade(string memory tradeId) external",
  "function cancelTrade(string memory tradeId) external",
  "function trades(string memory tradeId) external view returns (address buyer, address seller, uint256 tokenId, uint256 price, bool isFunded, bool isNftDeposited, bool isCompleted)",
  "event TradeInitiated(string tradeId, address indexed buyer, address indexed seller, uint256 tokenId, uint256 price)",
  "event FundsDeposited(string tradeId, address indexed buyer, uint256 amount)",
  "event NftDeposited(string tradeId, address indexed seller, uint256 tokenId)",
  "event TradeExecuted(string tradeId, address indexed buyer, address indexed seller, uint256 tokenId, uint256 price)",
  "event TradeCancelled(string tradeId, address indexed buyer)"
];

export const ERC721_ABI = [
  "function approve(address to, uint256 tokenId) external",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external"
];
