// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ArtistClonedFactory.sol";
import "hardhat/console.sol";
contract ArtistClonedCollections is ERC1155, Ownable, ERC2981 {
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

    struct Collection {
        string name;
        string style;
        string description;
        bool isPublic;
        string avatarIPFS_URL;
        uint96 defaultRoyalties;
        uint256 lastTokenId;
    }

    struct Token {
        uint256 collectionId;
        uint96 royalties;
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

    bool private initialized;

    constructor()
        ERC1155("https://your-metadata-uri/{id}.json")
        ERC2981()
        Ownable(msg.sender)
    {}

    // modifier onlyFactory() {
    //     require(
    //         msg.sender == factoryAddress,
    //         "Only factory can call this function"
    //     );
    //     _;
    // }

    function initialize(address _artist, address _factoryAddress) external {
        console.log("!!! ArtistClonedCollections.initialize !!!");
        console.log("msg.sender: ", msg.sender);
        console.log("factoryAddress: ", _factoryAddress);
        console.log("_artist: ", _artist);
        require(!initialized, "Already initialized");
        require(_artist != address(0), "Invalid artist address");
        require(msg.sender == _factoryAddress, "Caller is not the factory");
        require(_factoryAddress != address(0), "Invalid factory address");
        initialized = true;

        _transferOwnership(_artist);
        factoryAddress = _factoryAddress;
    }

    // 0.1 Ether
    uint256 tokenprice = 1 * 10 ** 17; // 0.1 * 10^18

    modifier onlyArtist() {
        require(
            msg.sender == owner(),
            "Only the artist can call this function"
        );
        _;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function createCollection(
        string memory _name,
        string memory _style,
        string memory _description,
        bool _isPublic,
        string memory _avatarIPFS_URL,
        uint96 _defaultRoyalties
    ) external onlyArtist returns (uint256) {
        require(_defaultRoyalties <= 10000, "Royalties must be <= 100%");

        collectionCounter++;
        collections[collectionCounter] = Collection({
            name: _name,
            style: _style,
            description: _description,
            isPublic: _isPublic,
            avatarIPFS_URL: _avatarIPFS_URL,
            defaultRoyalties: _defaultRoyalties,
            lastTokenId: 0
        });

        //emit event
        emit CollectionCreated(msg.sender, collectionCounter, _name);

        return collectionCounter;
    }

    function createToken(
        uint256 _collectionId,
        uint96 _tokenRoyalties,
        uint256 _price,
        string memory _tokenURI
    ) external onlyArtist returns (uint256) {
        require(
            _collectionId <= collectionCounter && _collectionId > 0,
            "Invalid collection ID"
        );
        require(_tokenRoyalties <= 10000, "Royalties must be <= 100%");
        require(_price > 0, "Price must be greater than 0");

        Collection storage collection = collections[_collectionId];
        collection.lastTokenId++;
        uint256 newTokenId = (_collectionId * 1000000) + collection.lastTokenId;

        tokens[newTokenId] = Token({
            collectionId: _collectionId,
            royalties: _tokenRoyalties,
            price: _price,
            exists: true
        });

        _tokenURIs[newTokenId] = _tokenURI;
        _setTokenRoyalty(newTokenId, owner(), _tokenRoyalties);

        //emit event
        emit TokenCreated(msg.sender, _collectionId, newTokenId);

        return newTokenId;
    }
    // !! remove _collectionID or change the logic because already included in token ID
    function mint(uint256 _tokenId, uint256 _collectionId) external payable {
        Token storage token = tokens[_tokenId];
        require(
            collections[_collectionId].isPublic,
            "Collection is not public"
        );
        require(token.exists, "Token does not exist");
        require(!hasMinted[_tokenId][msg.sender], "Already minted this token");
        require(msg.value == token.price, "Incorrect payment amount");

        // Calculate shares
        uint256 platformFee = getPlatformFee();
        uint256 platformShare = (msg.value * platformFee) / 10000; // 2.5% for the platform updatable
        uint256 artistShare = msg.value - platformShare; // 97.5% for the artist

        address platformAddress = getPlatformAddress();
        require(platformAddress != address(0), "Invalid platform address");

        //attention au token de base de la layer 2 qui sera la référence pour "ether" donc arb pour arbitrum, pol pour polygon, etc
        // Transfer shares to the platform and the artist
        (bool platformSuccess, ) = payable(platformAddress).call{
            value: platformShare
        }("");
        require(platformSuccess, "Platform payment failed");

        (bool artistSuccess, ) = payable(owner()).call{value: artistShare}("");
        require(artistSuccess, "Artist payment failed");

        // Mark as minted and transfer token
        hasMinted[_tokenId][msg.sender] = true;
        _mint(msg.sender, _tokenId, 1, "");

        //stocker les nft des utilisateurs avec mapping (address =>tab[collection][token])
        //ou alors indexer les event  des mints

        //emit event
        emit TokenMinted(msg.sender, _tokenId, _collectionId);
    }

    //compléxifier avec achat revente ?

    function getPlatformFee() public view returns (uint256) {
        (, uint256 platformFeePercentage, ) = ArtistClonedFactory(
            factoryAddress
        ).platformInfo();
        return platformFeePercentage;
    }

    function getPlatformAddress() public view returns (address) {
        (address platformAddress, , ) = ArtistClonedFactory(factoryAddress)
            .platformInfo();
        return platformAddress;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        require(tokens[tokenId].exists, "Token does not exist");
        return _tokenURIs[tokenId];
    }

    // function dropToSubscribers(uint256 tokenId) external onlyArtist {
    //     require(tokens[tokenId].exists, "Token does not exist");
    //     address[] memory subscribers = artistsManagement.getSubscribers(
    //         msg.sender
    //     );

    //     for (uint256 i = 0; i < subscribers.length; i++) {
    //         if (!hasMinted[tokenId][subscribers[i]]) {
    //             hasMinted[tokenId][subscribers[i]] = true;
    //             _mint(subscribers[i], tokenId, 1, "");
    //         }
    //     }
    // }

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
}
