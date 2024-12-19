// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "./ArtistClonedFactory.sol";
import "./ArtistClonedCollections.sol";

contract SampleComposition is ERC1155, ERC2981 {
    // Suppression de la variable minSamplesRoyalty
    // uint96 public minSamplesRoyalty;

    event CompositionCreated(
        uint256 indexed compositionId,
        address indexed creator
    );
    event CompositionMinted(
        uint256 indexed compositionId,
        address indexed minter
    );
    event SampleUsed(
        uint256 indexed sampleId,
        uint256 indexed compositionId,
        uint256 usageCount
    );
    event CompositionVisibilityChanged(
        uint256 indexed compositionId,
        bool isPublic
    );

    struct Composition {
        uint256[] usedSampleIds;
        uint256[] usageCount;
        uint96 creatorRoyalty; // Fixed at 5%
        uint256 price;
        uint256 maxSupply;
        uint256 currentSupply;
        address creator;
        bool isPublic;
        mapping(address => bool) hasValidated;
    }

    ArtistClonedFactory public factory;
    ArtistClonedCollections public collection;

    uint256 public compositionCounter;

    mapping(uint256 => Composition) public compositions;

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    constructor(
        address _factoryAddress
    )
        // Suppression du paramètre _minSamplesRoyalty
        ERC1155("")
    {
        factory = ArtistClonedFactory(_factoryAddress);
        // Suppression de l'initialisation de minSamplesRoyalty
    }

    function createComposition(
        uint256[] memory _sampleIds,
        uint256[] memory _usageCount,
        uint256 _price,
        uint256 _maxSupply,
        bool _isPublic
    ) external returns (uint256) {
        require(
            _sampleIds.length == _usageCount.length,
            "Arrays length mismatch"
        );

        compositionCounter++;

        Composition storage newComp = compositions[compositionCounter];
        newComp.usedSampleIds = _sampleIds;
        newComp.usageCount = _usageCount;
        newComp.creatorRoyalty = 500; // 5%
        newComp.price = _price;
        newComp.maxSupply = _maxSupply;
        newComp.creator = msg.sender;
        newComp.isPublic = _isPublic;

        // Emit events for each sample used
        // !!!check notion for how to retrieve the sample owner and the total usage of a sample !!!!
        for (uint i = 0; i < _sampleIds.length; i++) {
            emit SampleUsed(_sampleIds[i], compositionCounter, _usageCount[i]);
        }

        emit CompositionCreated(compositionCounter, msg.sender);
        return compositionCounter;
    }

    function mintComposition(uint256 _compositionId) external payable {
        Composition storage comp = compositions[_compositionId];
        require(comp.isPublic, "Not available for minting");
        require(comp.currentSupply < comp.maxSupply, "Max supply reached");
        require(msg.value == comp.price, "Incorrect payment");

        (address platformAddress, uint256 platformFee, ) = factory
            .platformInfo();
        uint256 platformShare = (msg.value * platformFee) / 10000;
        // Fixation à 5% pour le créateur de la composition
        uint256 creatorShare = (msg.value * 500) / 10000;

        payable(platformAddress).transfer(platformShare);
        payable(comp.creator).transfer(creatorShare);

        comp.currentSupply++;
        _mint(msg.sender, _compositionId, 1, "");
        emit CompositionMinted(_compositionId, msg.sender);
    }

    // New function to toggle isPublic for compositions
    function changeCompositionVisibility(uint256 _compositionId) external {
        Composition storage comp = compositions[_compositionId];

        // Ensure only the creator can change visibility
        require(
            msg.sender == comp.creator,
            "Only creator can change visibility"
        );

        // Toggle the isPublic value
        comp.isPublic = !comp.isPublic; // Invert the boolean value

        emit CompositionVisibilityChanged(_compositionId, comp.isPublic);
    }

    // Suppression de la fonction distributeToSampleOwners
    // Les samples sont maintenant totalement gratuits
}
