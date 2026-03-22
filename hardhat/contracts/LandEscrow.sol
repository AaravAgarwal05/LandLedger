// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LandEscrow is ReentrancyGuard {
    IERC721 public landNFT;

    struct Trade {
        address buyer;
        address seller;
        uint256 tokenId;
        uint256 price;
        bool isFunded;
        bool isCompleted;
    }

    // Mapping from tradeId (can be generated off-chain or sequentially) to Trade
    mapping(string => Trade) public trades;

    event TradeInitiated(string tradeId, address indexed buyer, address indexed seller, uint256 tokenId, uint256 price);
    event FundsDeposited(string tradeId, address indexed buyer, uint256 amount);
    event TradeExecuted(string tradeId, address indexed buyer, address indexed seller, uint256 tokenId, uint256 price);
    event TradeCancelled(string tradeId, address indexed buyer);

    constructor(address _landNFTAddress) {
        landNFT = IERC721(_landNFTAddress);
    }

    /**
     * @dev Initialize a trade with the agreed terms and deposit funds. 
     * Called by the buyer.
     */
    function depositFunds(string memory tradeId, address seller, uint256 tokenId) external payable nonReentrant {
        require(msg.value > 0, "Price must be greater than zero");
        require(trades[tradeId].buyer == address(0), "Trade already exists");

        trades[tradeId] = Trade({
            buyer: msg.sender,
            seller: seller,
            tokenId: tokenId,
            price: msg.value,
            isFunded: true,
            isCompleted: false
        });

        emit TradeInitiated(tradeId, msg.sender, seller, tokenId, msg.value);
        emit FundsDeposited(tradeId, msg.sender, msg.value);
    }

    /**
     * @dev Execute the trade. Called by the seller after approving the Escrow contract.
     * The seller must approve the Escrow contract to transfer the NFT before calling this.
     */
    function executeTrade(string memory tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        require(trade.isFunded, "Trade is not funded");
        require(!trade.isCompleted, "Trade already completed");
        require(msg.sender == trade.seller, "Only seller can execute");
        require(landNFT.ownerOf(trade.tokenId) == msg.sender, "Seller does not own the NFT");

        // Mark as completed
        trade.isCompleted = true;

        // Transfer NFT from Seller to Buyer
        landNFT.safeTransferFrom(msg.sender, trade.buyer, trade.tokenId);

        // Transfer funds to Seller
        (bool success, ) = payable(msg.sender).call{value: trade.price}("");
        require(success, "Transfer failed");

        emit TradeExecuted(tradeId, trade.buyer, msg.sender, trade.tokenId, trade.price);
    }

    /**
     * @dev Cancel the trade and refund the buyer. Can be called by buyer if seller isn't responding.
     */
    function cancelTrade(string memory tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        require(trade.isFunded, "Trade not active or already completed");
        require(!trade.isCompleted, "Trade already completed");
        require(msg.sender == trade.buyer || msg.sender == trade.seller, "Only buyer or seller can cancel");

        trade.isFunded = false;
        trade.isCompleted = true;

        // Refund buyer
        (bool success, ) = payable(trade.buyer).call{value: trade.price}("");
        require(success, "Refund failed");

        emit TradeCancelled(tradeId, trade.buyer);
    }
}
