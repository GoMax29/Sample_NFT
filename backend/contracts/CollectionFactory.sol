// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./ArtistCollection.sol";

contract CollectionFactory {
    /// @notice Event emitted when a collection is deployed
    event CollectionDeployed(
        address indexed owner,
        address indexed collectionAddress,
        string collectionName
    );

    /// @notice Deploy a new collection
    /// @param _name The name of the collection
    /// @param _symbol The symbol of the collection
    /// @param _style The style of the collection
    /// @param _description The description of the collection
    /// @param _isPublic The public status of the collection
    /// @param _collectionAvatarURL The avatar URL of the collection
    /// @return The address of the deployed collection

    function deployCollection(
        string memory _name,
        string memory _symbol,
        uint96 _royalties,
        string memory _style,
        string memory _description,
        bool _isPublic,
        string memory _collectionAvatarURL,
        address _artistsManagement
    ) external returns (address) {
        // Déploiement d'une nouvelle collection ERC-1155
        ArtistCollection newCollection = new ArtistCollection(
            msg.sender,
            _name,
            _symbol,
            _royalties,
            _style,
            _description,
            _isPublic,
            _collectionAvatarURL,
            _artistsManagement
        );

        emit CollectionDeployed(msg.sender, address(newCollection), _name);
        return address(newCollection);
    }
}
