// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// import "./ArtistCollection.sol";

contract ArtistManagement {
    //1 artiste peux s'inscrire = > ajout de l'artiste
    // 1 artiste peut ajouter des collecion à son compte
    //1 artite peut s'abonner se désabonner à un autre (fonction abonnement / désabonnement / mapping)
    //1 artiste peut dropper à ses abonnés (batch minting ) des samples  (events )

    event ArtistCreated(address indexed _artist, string _username);
    event Subscribed(address _subscriber, address _artist);
    event Unsubscribed(address _subscriber, address _artist);
    event NewDropFromArtist(
        address _artist,
        uint256 _sampleId,
        address[] _subscribers
    );

    struct User {
        // Structure de données

        string username;
        uint256 userCreationDate;
        string[] favouriteMusicStyle;
    }
    //mapping of artist to their subscriber
    mapping(address => address[]) internal Subscribers;
    mapping(address => mapping(address => bool)) private isSubscribed;

    //mapping of users to their artists
    mapping(address => address[]) internal mySubscriptions;
    User[] public Users;

    constructor() {}

    function createUser(
        string memory _username,
        address _userAddress,
        string[] memory favouriteMusicStyle
    ) external {
        User memory user = User(
            _username,
            block.timestamp,
            favouriteMusicStyle
        ); // création d'un nouvel utilisateur
        Users.push(user); // Ajout du nouvel utilisateur dans le tableau
        emit ArtistCreated(_userAddress, _username);
    }

    function subscribe(address _artist) public {
        require(_artist != msg.sender, "User cannot subscribe to yourself");
        require(
            !isSubscribed[msg.sender][_artist],
            "User has already subscribed to this artist"
        );
        Subscribers[_artist].push(msg.sender);
        isSubscribed[msg.sender][_artist] = true;
        emit Subscribed(msg.sender, _artist);
        mySubscriptions[msg.sender].push(_artist);
    }

    // Unsubscribe from an artist
    function unsubscribe(address _artist) external {
        require(
            isSubscribed[msg.sender][_artist],
            "Not subscribed to this artist"
        );

        // remove the subscriber from the artist's subscribers array
        address[] storage artistSubscribers_ = Subscribers[_artist];
        for (uint256 i = 0; i < artistSubscribers_.length; i++) {
            if (artistSubscribers_[i] == msg.sender) {
                //replace subscriber with the last one
                artistSubscribers_[i] = artistSubscribers_[
                    artistSubscribers_.length - 1
                ];
                //remove the last one
                artistSubscribers_.pop();
                break;
            }
        }

        //remove the artist from the user's mySubscriptions array
        for (uint256 i = 0; i < mySubscriptions[msg.sender].length; i++) {
            if (mySubscriptions[msg.sender][i] == _artist) {
                mySubscriptions[msg.sender][i] = mySubscriptions[msg.sender][
                    mySubscriptions[msg.sender].length - 1
                ];
                mySubscriptions[msg.sender].pop();
                break;
            }
        }

        isSubscribed[msg.sender][_artist] = false;

        emit Unsubscribed(msg.sender, _artist);
    }

    // Voir les abonnés d'un artiste
    function getSubscribers(
        address _artist
    ) external view returns (address[] memory) {
        return Subscribers[_artist];
    }

    // Voir les artistes que suit un utilisateur
    function getMySubscriptions(
        address _user
    ) external view returns (address[] memory) {
        return mySubscriptions[_user];
    }
}
