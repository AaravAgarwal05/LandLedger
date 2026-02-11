// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LandNFT
 * @dev ERC-721 NFT representing land ownership with IPFS metadata
 */
contract LandNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Events
    event LandMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor() ERC721("LandNFT", "LAND") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    /**
     * @dev Mint a new Land NFT
     * @param to The address that will receive the NFT
     * @param tokenURI The IPFS URI for the NFT metadata (e.g., ipfs://bafkrei...)
     * @return tokenId The ID of the newly minted token
     */
    function mintTo(address to, string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit LandMinted(to, tokenId, tokenURI);
        
        return tokenId;
    }

    // The following functions are overrides required by Solidity.
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
