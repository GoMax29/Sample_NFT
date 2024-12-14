const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ArtistClonedCollections", function () {
  let Collections;
  let Factory;
  let owner, artist, user1, user2, platform;

  // Deploy Fixtures
  async function deployFactoryAndCollectionsFixture() {
    [owner, artist, user1, user2, platform] = await ethers.getSigners();

    // Deploy the master collection contract
    const ArtistClonedCollections = await ethers.getContractFactory(
      "ArtistClonedCollections"
    );
    const masterCollections = await ArtistClonedCollections.deploy();
    await masterCollections.waitForDeployment();
    const masterAddress = await masterCollections.getAddress();

    // Deploy the factory with the master collection
    const ArtistClonedFactory = await ethers.getContractFactory(
      "ArtistClonedFactory"
    );
    Factory = await ArtistClonedFactory.deploy(
      platform.address,
      masterAddress,
      250 // 2.5% platform fee
    );

    // Register artist and get their collection contract
    await Factory.connect(artist).deployArtistClonedCollections("Test Artist", [
      "Rock",
      "Pop",
    ]);

    const collectionAddress = await Factory.artistToCollections(artist.address);
    Collections = await ethers.getContractAt(
      "ArtistClonedCollections",
      collectionAddress
    );

    return { Collections, Factory, owner, artist, user1, user2, platform };
  }

  // Test Collections
  describe("Collection Management", function () {
    it("Should create a new collection", async function () {
      const { Collections, artist } = await loadFixture(
        deployFactoryAndCollectionsFixture
      );

      await Collections.connect(artist).createCollection(
        "My First Collection",
        "Rock",
        "A great collection",
        true,
        "ipfs://collection-avatar",
        500 // 5% royalties
      );

      const collection = await Collections.collections(1);
      expect(collection.name).to.equal("My First Collection");
      expect(collection.style).to.equal("Rock");
      expect(collection.description).to.equal("A great collection");
      expect(collection.isPublic).to.be.true;
      expect(collection.avatarIPFS_URL).to.equal("ipfs://collection-avatar");
      expect(collection.defaultRoyalties).to.equal(500);
    });

    it("Should not allow non-artist to create collection", async function () {
      const { Collections, user1 } = await loadFixture(
        deployFactoryAndCollectionsFixture
      );

      await expect(
        Collections.connect(user1).createCollection(
          "Unauthorized Collection",
          "Pop",
          "Description",
          true,
          "ipfs://avatar",
          500
        )
      ).to.be.revertedWith("Only the artist can call this function");
    });
  });

  // Test Tokens
  describe("Token Management", function () {
    async function createCollectionFixture() {
      const deployment = await deployFactoryAndCollectionsFixture();
      await deployment.Collections.connect(deployment.artist).createCollection(
        "Test Collection",
        "Rock",
        "Test Description",
        true,
        "ipfs://avatar",
        500
      );
      return deployment;
    }

    it("Should create a new token in a collection", async function () {
      const { Collections, artist } = await loadFixture(
        createCollectionFixture
      );

      await Collections.connect(artist).createToken(
        1, // collection ID
        500, // 5% royalties
        ethers.parseEther("0.1"), // price
        "ipfs://token-uri"
      );

      const token = await Collections.tokens(1000001); // First token in collection 1
      expect(token.collectionId).to.equal(1);
      expect(token.royalties).to.equal(500);
      expect(token.price).to.equal(ethers.parseEther("0.1"));
      expect(token.exists).to.be.true;
    });

    it("Should allow users to mint tokens", async function () {
      const { Collections, user1 } = await loadFixture(createCollectionFixture);

      // Create token first
      await Collections.connect(artist).createToken(
        1,
        500,
        ethers.parseEther("0.1"),
        "ipfs://token-uri"
      );

      // Mint token
      await Collections.connect(user1).mint(
        1000001, // token ID
        1, // collection ID
        { value: ethers.parseEther("0.1") }
      );

      expect(await Collections.balanceOf(user1.address, 1000001)).to.equal(1);
    });

    it("Should distribute payments correctly when minting", async function () {
      const { Collections, artist, user1, platform } = await loadFixture(
        createCollectionFixture
      );

      // Create token
      await Collections.connect(artist).createToken(
        1,
        500,
        ethers.parseEther("1.0"),
        "ipfs://token-uri"
      );

      // Get initial balances
      const initialArtistBalance = await ethers.provider.getBalance(
        artist.address
      );
      const initialPlatformBalance = await ethers.provider.getBalance(
        platform.address
      );

      // Mint token
      await Collections.connect(user1).mint(1000001, 1, {
        value: ethers.parseEther("1.0"),
      });

      // Check final balances
      const finalArtistBalance = await ethers.provider.getBalance(
        artist.address
      );
      const finalPlatformBalance = await ethers.provider.getBalance(
        platform.address
      );

      // Platform should receive 2.5%
      expect(finalPlatformBalance - initialPlatformBalance).to.equal(
        ethers.parseEther("0.025")
      );

      // Artist should receive 97.5%
      expect(finalArtistBalance - initialArtistBalance).to.equal(
        ethers.parseEther("0.975")
      );
    });
  });

  // Test URI Management
  describe("URI Management", function () {
    it("Should return correct token URI", async function () {
      const { Collections, artist } = await loadFixture(
        deployFactoryAndCollectionsFixture
      );

      // Create collection and token
      await Collections.connect(artist).createCollection(
        "Test Collection",
        "Rock",
        "Description",
        true,
        "ipfs://avatar",
        500
      );

      await Collections.connect(artist).createToken(
        1,
        500,
        ethers.parseEther("0.1"),
        "ipfs://token-uri"
      );

      expect(await Collections.uri(1000001)).to.equal("ipfs://token-uri");
    });

    it("Should revert when requesting URI for non-existent token", async function () {
      const { Collections } = await loadFixture(
        deployFactoryAndCollectionsFixture
      );

      await expect(Collections.uri(999999)).to.be.revertedWith(
        "Token does not exist"
      );
    });
  });

  // Test Price Management
  describe("Price Management", function () {
    it("Should allow artist to update token price", async function () {
      const { Collections, artist } = await loadFixture(
        deployFactoryAndCollectionsFixture
      );

      // Create collection and token
      await Collections.connect(artist).createCollection(
        "Test Collection",
        "Rock",
        "Description",
        true,
        "ipfs://avatar",
        500
      );

      await Collections.connect(artist).createToken(
        1,
        500,
        ethers.parseEther("0.1"),
        "ipfs://token-uri"
      );

      // Update price
      await Collections.connect(artist).updateTokenPrice(
        1000001,
        ethers.parseEther("0.2")
      );

      expect(await Collections.getTokenPrice(1000001)).to.equal(
        ethers.parseEther("0.2")
      );
    });

    it("Should not allow non-artist to update token price", async function () {
      const { Collections, artist, user1 } = await loadFixture(
        deployFactoryAndCollectionsFixture
      );

      // Create collection and token
      await Collections.connect(artist).createCollection(
        "Test Collection",
        "Rock",
        "Description",
        true,
        "ipfs://avatar",
        500
      );

      await Collections.connect(artist).createToken(
        1,
        500,
        ethers.parseEther("0.1"),
        "ipfs://token-uri"
      );

      // Try to update price as non-artist
      await expect(
        Collections.connect(user1).updateTokenPrice(
          1000001,
          ethers.parseEther("0.2")
        )
      ).to.be.revertedWith("Only the artist can call this function");
    });
  });
});
