// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./ArtistClonedCollections.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "hardhat/console.sol";

contract ArtistClonedFactory is Ownable {
    event ArtistCollectionsDeployed(
        address indexed artist,
        address indexed collectionsContract
    );

    event ArtistRegistered(
        address indexed artistAddress,
        string name,
        uint256 deploymentDate
    );

    struct PlatformInfo {
        address treasuryAddress;
        uint256 platformFeePercentage;
        uint256 lastUpdated;
    }

    struct ArtistInfo {
        string name;
        string[] musicStyles;
        uint256 deploymentDate;
        bool isRegistered;
    }

    PlatformInfo public platformInfo;

    // Mapping from artist address to their ArtistCollections contract
    mapping(address => address) public artistToCollections;
    // Mapping from artist address to their info
    mapping(address => ArtistInfo) public artistInfo;

    address public masterArtistCollections;

    // Pour garder une trace de tous les artistes
    address[] public registeredArtists;

    // Add this to your existing contract
    mapping(string => bool) public artistNameTaken;

    constructor(
        address _treasuryAddress,
        address _masterArtistCollectionsAddress,
        uint256 _platformFeePercentage
    ) Ownable(msg.sender) {
        //verify is platform address is a valid ethereum address
        require(_treasuryAddress != address(0), "Invalid treasury address");
        //verify is master artist collections address is a valid ethereum address
        require(
            _masterArtistCollectionsAddress != address(0),
            "Invalid master artist collections address"
        );
        require(
            _platformFeePercentage <= 10000,
            "Fee percentage must be less than or equal to 100%"
        );

        platformInfo = PlatformInfo({
            treasuryAddress: _treasuryAddress,
            platformFeePercentage: _platformFeePercentage,
            lastUpdated: block.timestamp
        });
        // masterArtistCollections is the address of the master ArtistCollections
        // contract and has been deployed and verified before the factory contract deployment
        masterArtistCollections = _masterArtistCollectionsAddress;
    }

    function deployArtistClonedCollections(
        string memory _artistName,
        string[] memory _musicStyles
    ) external returns (address) {
        require(
            artistToCollections[msg.sender] == address(0),
            "Artist already has a collections contract"
        );
        //require(masterArtistCollections != address(0), "Master not set");
        require(bytes(_artistName).length > 0, "Artist name cannot be empty");
        require(
            _musicStyles.length > 0,
            "Must provide at least one music style"
        );
        // Add name uniqueness check
        require(!artistNameTaken[_artistName], "Artist name already exists");

        // Cloner le Master
        address payable clone = payable(Clones.clone(masterArtistCollections));
        console.log("address(this): ", address(this));
        // Initialiser le Clone
        ArtistClonedCollections(clone).initialize(msg.sender, address(this));
        // Enregistrer le Clone
        artistToCollections[msg.sender] = clone;
        console.log("!!! ArtistClonedFactory: !!!");
        console.log("musicStyles: ", _musicStyles[0]);
        // Enregistrer les informations de l'artiste
        artistInfo[msg.sender] = ArtistInfo({
            name: _artistName,
            musicStyles: _musicStyles,
            deploymentDate: block.timestamp,
            isRegistered: true
        });
        registeredArtists.push(msg.sender);
        // Mark the name as taken
        artistNameTaken[_artistName] = true;
        emit ArtistCollectionsDeployed(msg.sender, clone);
        emit ArtistRegistered(msg.sender, _artistName, block.timestamp);
        return clone;
    }

    function updatePlatformInfo(
        address _newTreasuryAddress,
        uint256 _newPlatformFeePercentage
    ) external onlyOwner {
        platformInfo.treasuryAddress = _newTreasuryAddress;
        platformInfo.platformFeePercentage = _newPlatformFeePercentage;
        platformInfo.lastUpdated = block.timestamp;
    }

    function getPlatformInfo()
        external
        view
        returns (
            address treasuryAddress,
            uint256 platformFeePercentage,
            uint256 lastUpdated
        )
    {
        return (
            platformInfo.treasuryAddress,
            platformInfo.platformFeePercentage,
            platformInfo.lastUpdated
        );
    }

    // Fonction pour obtenir les informations d'un artiste
    function getArtistInfo(
        address _artist
    )
        external
        view
        returns (
            string memory name,
            string[] memory musicStyles,
            uint256 deploymentDate,
            bool isRegistered
        )
    {
        ArtistInfo storage info = artistInfo[_artist];
        return (
            info.name,
            info.musicStyles,
            info.deploymentDate,
            info.isRegistered
        );
    }

    // Fonction pour obtenir le nombre total d'artistes enregistrés
    function getTotalArtists() external view returns (uint256) {
        return registeredArtists.length;
    }

    //get the artist collections contract address
    function getArtistCollections(
        address artist
    ) external view returns (address) {
        return artistToCollections[artist];
    }
}
