// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ArtistClonedFactory.sol";
import "hardhat/console.sol";

contract ArtistClonedCollections is
    Initializable,
    ERC1155Upgradeable,
    OwnableUpgradeable
{
    event CollectionCreated(
        address indexed artist,
        uint256 indexed collectionId,
        string name
    );

    event TokenCreated(
        address indexed artist,
        uint256 indexed collectionId,
        uint256 tokenId
    );

    event TokenMinted(
        address indexed user,
        uint256 indexed tokenId,
        uint256 collectionId
    );

    event CollectionVisibilityChanged(
        uint256 indexed collectionId,
        bool isPublic
    );

    struct Collection {
        string name;
        string style;
        string description;
        bool isPublic;
        string avatarIPFS_URL;
        uint256 lastTokenId;
    }

    struct Token {
        uint256 collectionId;
        uint256 price;
        bool exists;
    }

    // Mapping from collection ID to Collection details
    mapping(uint256 => Collection) public collections;
    // Mapping from token ID to Token details
    mapping(uint256 => Token) public tokens;
    // Mapping from token ID to token URI
    mapping(uint256 => string) private _tokenURIs;
    // Mapping from user address to whether they've minted a specific token
    mapping(uint256 => mapping(address => bool)) public hasMinted;

    uint256 public collectionCounter;

    address public factoryAddress;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _artist,
        address _factoryAddress
    ) external initializer {
        console.log("!!! ArtistClonedCollections.initialize !!!");
        console.log("msg.sender: ", msg.sender);
        console.log("factoryAddress: ", _factoryAddress);
        console.log("_artist: ", _artist);
        require(_artist != address(0), "Invalid artist address");
        require(_factoryAddress != address(0), "Invalid factory address");

        // Properly initialize inherited contracts
        __ERC1155_init("");
        __Ownable_init(_artist);

        // _transferOwnership(_artist);
        factoryAddress = _factoryAddress;
    }

    //ça vener cyril !!
    modifier onlyArtist() {
        require(
            msg.sender == owner(),
            "Only the artist can call this function"
        );
        _;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155Upgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function createCollection(
        string memory _name,
        string memory _style,
        string memory _description,
        bool _isPublic,
        string memory _avatarIPFS_URL
    ) external onlyArtist returns (uint256) {
        collectionCounter++;
        collections[collectionCounter] = Collection({
            name: _name,
            style: _style,
            description: _description,
            isPublic: _isPublic,
            avatarIPFS_URL: _avatarIPFS_URL,
            lastTokenId: 0
        });

        //emit event
        emit CollectionCreated(msg.sender, collectionCounter, _name);
        return collectionCounter;
    }

    function createToken(
        uint256 _collectionId,
        uint256 _price,
        string memory _tokenURI
    ) external onlyArtist returns (uint256) {
        require(_collectionId <= 1024, "Collection ID exceeds maximum");
        require(_collectionId > 0, "Invalid collection ID");

        Collection storage collection = collections[_collectionId];
        collection.lastTokenId++;
        require(
            collection.lastTokenId <= 256,
            "Token limit reached for collection"
        );

        // New token ID generation
        uint256 newTokenId = (uint256(uint160(address(this))) << 32) | // Contract address (160 bits)
            (_collectionId << 10) | // Collection ID (10 bits)
            (collection.lastTokenId); // Token number (10 bits)

        tokens[newTokenId] = Token({
            collectionId: _collectionId,
            price: _price,
            exists: true
        });

        _tokenURIs[newTokenId] = _tokenURI;

        //emit event
        emit TokenCreated(msg.sender, _collectionId, newTokenId);
        return newTokenId;
    }

    function getCollectionAddress(
        uint256 _tokenId
    ) public pure returns (address) {
        return address(uint160(_tokenId >> 32));
    }

    function getCollectionId(uint256 _tokenId) public pure returns (uint256) {
        return (_tokenId >> 10) & 0x3FF;
    }

    function getTokenNumber(uint256 _tokenId) public pure returns (uint256) {
        return _tokenId & 0x3FF;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        require(tokens[tokenId].exists, "Token does not exist");
        return _tokenURIs[tokenId];
    }

    // Add getter for token price
    function getTokenPrice(uint256 _tokenId) external view returns (uint256) {
        require(tokens[_tokenId].exists, "Token does not exist");
        return tokens[_tokenId].price;
    }

    // Allow artist to update price
    function updateTokenPrice(
        uint256 _tokenId,
        uint256 _newPrice
    ) external onlyArtist {
        require(tokens[_tokenId].exists, "Token does not exist");
        require(_newPrice > 0, "Price must be greater than 0");
        tokens[_tokenId].price = _newPrice;
    }

    // Required for receiving ETH
    receive() external payable {}
    fallback() external payable {}

    function mintBatch(uint256[] memory _tokenIds) external payable {
        require(_tokenIds.length > 0, "Empty token array");

        uint256 totalCost = 0;

        // Track tokens to actually mint
        uint256[] memory tokensToMint = new uint256[](_tokenIds.length);
        uint256 actualMintCount = 0;

        // Validate tokens and calculate total cost
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            Token storage token = tokens[_tokenIds[i]];
            uint256 collectionId = getCollectionId(_tokenIds[i]);

            require(token.exists, "Token does not exist");
            require(
                collections[collectionId].isPublic,
                "Collection is not public"
            );

            // Only add to mint list if not already minted
            if (!hasMinted[_tokenIds[i]][msg.sender]) {
                totalCost += token.price;
                tokensToMint[actualMintCount] = _tokenIds[i];
                actualMintCount++;
            }
        }

        require(msg.value == totalCost, "Incorrect payment amount");

        // Skip platform and artist payment if no tokens to mint
        if (actualMintCount > 0) {
            // Get platform info
            (
                address treasuryAddress,
                uint256 platformFeePercentage,

            ) = ArtistClonedFactory(factoryAddress).getPlatformInfo();

            require(treasuryAddress != address(0), "Invalid treasury address");

            // Calculate shares
            uint256 platformShare = (msg.value * platformFeePercentage) / 10000;
            uint256 artistShare = msg.value - platformShare;

            // Transfer platform fee
            (bool treasurySuccess, ) = payable(treasuryAddress).call{
                value: platformShare
            }("");
            require(treasurySuccess, "Treasury payment failed");

            // Transfer artist share
            (bool artistSuccess, ) = payable(owner()).call{value: artistShare}(
                ""
            );
            require(artistSuccess, "Artist payment failed");

            // Prepare final arrays for minting (trimmed to actual mint count)
            uint256[] memory finalTokensToMint = new uint256[](actualMintCount);
            uint256[] memory amounts = new uint256[](actualMintCount);

            for (uint256 i = 0; i < actualMintCount; i++) {
                finalTokensToMint[i] = tokensToMint[i];
                amounts[i] = 1;
                hasMinted[tokensToMint[i]][msg.sender] = true;
            }

            // Batch mint only non-minted tokens
            _mintBatch(msg.sender, finalTokensToMint, amounts, "");

            // Emit batch event
            emit TransferBatch(
                msg.sender,
                address(0),
                msg.sender,
                finalTokensToMint,
                amounts
            );
        }
    }

    function toggleCollectionVisibility(
        uint256 _collectionId
    ) external onlyArtist {
        require(
            _collectionId > 0 && _collectionId <= collectionCounter,
            "Collection does not exist"
        );

        Collection storage collection = collections[_collectionId];

        // Toggle the isPublic value
        collection.isPublic = !collection.isPublic;

        emit CollectionVisibilityChanged(_collectionId, collection.isPublic);
    }
}
