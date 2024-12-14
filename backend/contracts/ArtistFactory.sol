// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./ArtistCollections.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArtistFactory is Ownable {
    struct PlatformInfo {
        address platformAddress;
        uint256 platformFeePercentage;
        uint256 lastUpdated;
    }

    PlatformInfo public platformInfo;

    // Mapping from artist address to their ArtistCollections contract
    mapping(address => address) public artistToCollections;

    event ArtistFactoryDeployed(address indexed artistFactory);

    event ArtistCollectionsDeployed(
        address indexed artist,
        address indexed collectionsContract
    );

    constructor(
        address _platformAddress,
        uint256 _platformFeePercentage
    ) Ownable(msg.sender) {
        platformInfo = PlatformInfo({
            platformAddress: _platformAddress,
            platformFeePercentage: _platformFeePercentage,
            lastUpdated: block.timestamp
        });
        emit ArtistFactoryDeployed(address(this));
    }

    function updatePlatformInfo(
        address _newPlatformAddress,
        uint256 _newPlatformFeePercentage
    ) external onlyOwner {
        platformInfo.platformAddress = _newPlatformAddress;
        platformInfo.platformFeePercentage = _newPlatformFeePercentage;
        platformInfo.lastUpdated = block.timestamp;
    }

    function deployArtistCollections() external returns (address) {
        require(
            artistToCollections[msg.sender] == address(0),
            "Artist already has a collections contract"
        );
        //deploy the artist collections contract
        ArtistCollections newArtistCollections = new ArtistCollections(
            msg.sender,
            address(this)
        );
        //set the artist collections contract to the artist address in the mapping
        artistToCollections[msg.sender] = address(newArtistCollections);

        emit ArtistCollectionsDeployed(
            msg.sender,
            address(newArtistCollections)
        );
        return address(newArtistCollections);
    }

    //get the artist collections contract address
    function getArtistCollections(
        address artist
    ) external view returns (address) {
        return artistToCollections[artist];
    }
}
