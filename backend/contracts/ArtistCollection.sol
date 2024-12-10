// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "./ArtistsManagement.sol";

interface IArtistsManagement {
    function getSubscribers(
        address artist
    ) external view returns (address[] memory);
}

contract ArtistCollection is ERC1155, Ownable, ERC2981 {
    string public collectionName;
    string public collectionSymbol;
    string public collectionStyle;
    string public collectionDescription;
    bool public collectionIsPublic;
    //counter for next id
    uint256 public _tokenId;
    string public collectionAvatarURL;
    IArtistsManagement public artistsManagement;

    // Use a private mapping instead
    mapping(uint256 => string) private _tokenURIs;

    constructor(
        address _artist,
        string memory _name,
        string memory _symbol,
        uint96 _defaultRoyalties,
        string memory _style,
        string memory _description,
        bool _isPublic,
        string memory _collectionAvatarURL,
        address _artistsManagement
    ) ERC1155("") Ownable(msg.sender) {
        artistsManagement = IArtistsManagement(_artistsManagement);
        collectionName = _name;
        collectionSymbol = _symbol;
        collectionStyle = _style;
        collectionDescription = _description;
        collectionIsPublic = _isPublic;
        collectionAvatarURL = _collectionAvatarURL;
        // Définir une royalty par défaut (par exemple, 10% pour le créateur)
        _setDefaultRoyalty(_artist, _defaultRoyalties);
        transferOwnership(_artist); // The artist owns this collection
    }

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

    function mint(uint256 _amount, uint96 _tokenRoyalties) external onlyArtist {
        require(_amount > 0 && _amount <= 1000, "Invalid token amount");
        require(_tokenRoyalties <= 10000, "Royalties must be <= 100%");
        require(msg.sender != address(0), "Invalid artist address");
        _tokenId++;
        uint256 newItemId = _tokenId;
        if (_tokenRoyalties > 0) {
            // Définir une royalty spécifique pour ce token : fournie par _tokenRoyalties
            _setTokenRoyalty(newItemId, msg.sender, _tokenRoyalties);
        }
        // mint with ERC1155 function
        _mint(msg.sender, newItemId, _amount, "");
    }

    function setSampleURI(
        uint256 sampleId,
        string memory newUri
    ) external onlyArtist {
        _tokenURIs[sampleId] = newUri;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory tokenURI = _tokenURIs[tokenId];
        require(bytes(tokenURI).length > 0, "URI not set for this token");
        return tokenURI;
    }

    //drop sample to all your subscribers
    function dropToSubscribers(uint256 tokenId) external onlyArtist {
        address[] memory subscribers = artistsManagement.getSubscribers(
            msg.sender
        );
        for (uint256 i = 0; i < subscribers.length; i++) {
            _mint(subscribers[i], tokenId, 1, "");
        }
    }
}
