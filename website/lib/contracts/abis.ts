export const LAND_ESCROW_ABI = [
  "function depositFunds(string memory tradeId, address seller, uint256 tokenId) external payable",
  "function executeTrade(string memory tradeId) external",
  "function cancelTrade(string memory tradeId) external",
  "event TradeInitiated(string tradeId, address indexed buyer, address indexed seller, uint256 tokenId, uint256 price)",
  "event FundsDeposited(string tradeId, address indexed buyer, uint256 amount)",
  "event TradeExecuted(string tradeId, address indexed buyer, address indexed seller, uint256 tokenId, uint256 price)",
  "event TradeCancelled(string tradeId, address indexed buyer)"
];

export const ERC721_ABI = [
  "function approve(address to, uint256 tokenId) external",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external"
];
