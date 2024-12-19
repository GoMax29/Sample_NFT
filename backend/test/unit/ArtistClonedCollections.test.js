const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ArtistClonedCollections", function () {
  async function deployContractsFixture() {
    const [admin, treasurer, ceo, newTreasurer, artist, user1, user2] =
      await ethers.getSigners();

    // 1. Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(admin.address, treasurer.address);
    await treasury.waitForDeployment();
    console.log("Treasury deployed at:", await treasury.getAddress());

    // Validate Treasury address
    const treasuryAddress = await treasury.getAddress();
    if (!treasuryAddress) {
      throw new Error("Treasury deployment failed: Address is null");
    }

    // 2. Deploy Master ArtistClonedCollections
    const MasterArtistClonedCollections = await ethers.getContractFactory(
      "ArtistClonedCollections"
    );
    const masterCollections = await MasterArtistClonedCollections.deploy();
    await masterCollections.waitForDeployment();
    const masterCollectionsAddress = await masterCollections.getAddress();
    console.log(
      "MasterArtistClonedCollections deployed at:",
      masterCollectionsAddress
    );

    // Validate MasterArtistClonedCollections address
    if (!masterCollectionsAddress) {
      throw new Error(
        "MasterArtistClonedCollections deployment failed: Address is null"
      );
    }

    // 3. Deploy ArtistClonedFactory with Treasury and Master Collections addresses
    const Factory = await ethers.getContractFactory("ArtistClonedFactory");
    const factory = await Factory.deploy(
      treasuryAddress,
      masterCollectionsAddress,
      250 // Platform fee: 2.5%
    );
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("Factory deployed at:", factoryAddress);

    // Validate Factory address
    if (!factoryAddress) {
      throw new Error("Factory deployment failed: Address is null");
    }

    // 4. Artist deploys their cloned collections via Factory
    const tx = await factory
      .connect(artist)
      .deployArtistClonedCollections("ArtistName", ["Rock"]);
    const receipt = await tx.wait();
    console.log("Artist deployArtistClonedCollections transaction mined");

    // Extract the cloned collections address from the event
    const event = receipt.logs.find((log) => {
      try {
        return (
          factory.interface.parseLog(log).name === "ArtistCollectionsDeployed"
        );
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error(
        "ArtistCollectionsDeployed event not found in transaction receipt"
      );
    }

    const artistCollectionsAddress =
      factory.interface.parseLog(event).args.collectionsContract;
    console.log("ArtistCollections deployed at:", artistCollectionsAddress);

    // Validate ArtistCollections address
    if (
      !artistCollectionsAddress ||
      artistCollectionsAddress === ethers.ZeroAddress
    ) {
      throw new Error("ArtistCollections deployment failed: Invalid address");
    }

    // 5. Attach to the deployed ArtistClonedCollections contract
    const ArtistClonedCollections = await ethers.getContractFactory(
      "ArtistClonedCollections"
    );
    const artistCollections = ArtistClonedCollections.attach(
      artistCollectionsAddress
    );
    console.log(
      "Attached to ArtistClonedCollections at:",
      artistCollections.target
    );

    // Final validation
    if (!artistCollections.target) {
      throw new Error(
        "ArtistClonedCollections attachment failed: Address is null"
      );
    }

    return {
      treasury,
      factory,
      masterCollections,
      artist,
      artistCollections,
      user1,
      user2,
      admin,
      treasurer,
      ceo,
      newTreasurer,
    };
  }

  describe("Collection Management", function () {
    it("Should create a new collection", async function () {
      const { artist, artistCollections } = await loadFixture(
        deployContractsFixture
      );

      const tx = await artistCollections.connect(artist).createCollection(
        "New Collection",
        "Jazz",
        "A new collection description",
        true, // isPublic
        "ipfs://avatarURI"
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find((log) => {
        try {
          const parsed = artistCollections.interface.parseLog(log);
          return parsed.name === "CollectionCreated";
        } catch {
          return false;
        }
      });

      const [eventArtist, collectionId, name] = event.args;

      expect(eventArtist).to.equal(artist.address);
      expect(collectionId).to.equal(1); // Assuming it's the first collection
      expect(name).to.equal("New Collection");

      const collection = await artistCollections.collections(1);
      expect(collection.name).to.equal("New Collection");
      expect(collection.style).to.equal("Jazz");
      expect(collection.description).to.equal("A new collection description");
      expect(collection.isPublic).to.equal(true);
      expect(collection.avatarIPFS_URL).to.equal("ipfs://avatarURI");
      expect(collection.lastTokenId).to.equal(0);
    });

    it("Should not allow non-artist to create collection", async function () {
      const { artistCollections, user1 } = await loadFixture(
        deployContractsFixture
      );

      await expect(
        artistCollections
          .connect(user1)
          .createCollection(
            "Unauthorized Collection",
            "Pop",
            "Should fail",
            true,
            "ipfs://invalidURI"
          )
      ).to.be.revertedWith("Only the artist can call this function");
    });
  });

  describe("Token Management", function () {
    it("Should create a new token in a collection", async function () {
      const { artist, artistCollections } = await loadFixture(
        deployContractsFixture
      );

      // Create a collection first
      await artistCollections
        .connect(artist)
        .createCollection(
          "Token Collection",
          "Electronic",
          "Collection for electronic tokens",
          true,
          "ipfs://avatarTokenURI"
        );

      const tx = await artistCollections
        .connect(artist)
        .createToken(1, ethers.parseEther("0.5"), "ipfs://tokenURI1");
      const receipt = await tx.wait();

      // Updated event handling for ethers v6
      const event = receipt.logs.find((log) => {
        try {
          const parsed = artistCollections.interface.parseLog(log);
          return parsed.name === "TokenCreated";
        } catch {
          return false;
        }
      });

      const parsedEvent = artistCollections.interface.parseLog(event);
      const [eventArtist, collectionId, tokenId] = parsedEvent.args;

      expect(eventArtist).to.equal(artist.address);
      expect(collectionId).to.equal(1);

      const token = await artistCollections.tokens(tokenId);
      expect(token.collectionId).to.equal(1);
      expect(token.price).to.equal(ethers.parseEther("0.5"));
      expect(token.exists).to.equal(true);
    });

    it("Should allow minting of tokens", async function () {
      const { artist, artistCollections, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Create and deploy a collection
      await artistCollections
        .connect(artist)
        .createCollection(
          "Mint Collection",
          "Hip-Hop",
          "Collection for mint testing",
          true,
          "ipfs://avatarMintURI"
        );

      // Create a token
      const createTokenTx = await artistCollections
        .connect(artist)
        .createToken(1, ethers.parseEther("1.0"), "ipfs://tokenMintURI");
      const createTokenReceipt = await createTokenTx.wait();

      const createTokenEvent = createTokenReceipt.logs.find((log) => {
        try {
          const parsed = artistCollections.interface.parseLog(log);
          return parsed.name === "TokenCreated";
        } catch {
          return false;
        }
      });

      const parsedCreateEvent =
        artistCollections.interface.parseLog(createTokenEvent);
      const tokenId = parsedCreateEvent.args[2]; // TokenId is the third argument

      // Mint the token
      const mintTx = await artistCollections
        .connect(user1)
        .mintBatch([tokenId], { value: ethers.parseEther("1.0") });
      await mintTx.wait();

      // Check the minted token balance
      const balance = await artistCollections.balanceOf(user1.address, tokenId);
      expect(balance).to.equal(1);

      // Ensure the user hasn't minted it again
      const hasMinted = await artistCollections.hasMinted(
        tokenId,
        user1.address
      );
      expect(hasMinted).to.equal(true);
    });

    it("Should correctly encode and decode token IDs", async function () {
      const { artist, artistCollections } = await loadFixture(
        deployContractsFixture
      );

      // Create a collection
      await artistCollections
        .connect(artist)
        .createCollection(
          "Encode Collection",
          "Classical",
          "Collection for encoding test",
          true,
          "ipfs://avatarEncodeURI"
        );

      // Create a token
      const createTokenTx = await artistCollections
        .connect(artist)
        .createToken(1, ethers.parseEther("2.0"), "ipfs://tokenEncodeURI");
      const createTokenReceipt = await createTokenTx.wait();

      const createTokenEvent = createTokenReceipt.logs.find((log) => {
        try {
          const parsed = artistCollections.interface.parseLog(log);
          return parsed.name === "TokenCreated";
        } catch {
          return false;
        }
      });

      const parsedCreateEvent =
        artistCollections.interface.parseLog(createTokenEvent);
      const tokenId = parsedCreateEvent.args[2];

      // Decode the token ID
      const decodedCollectionId =
        await artistCollections.getCollectionId(tokenId);
      const decodedTokenNumber =
        await artistCollections.getTokenNumber(tokenId);
      const decodedCollectionAddress =
        await artistCollections.getCollectionAddress(tokenId);

      expect(decodedCollectionId).to.equal(1);
      expect(decodedTokenNumber).to.equal(1);
      expect(decodedCollectionAddress).to.equal(
        await artistCollections.getAddress()
      );
    });

    it("Should maintain token ID structure across different collections", async function () {
      const { artist, artistCollections } = await loadFixture(
        deployContractsFixture
      );

      // Create two collections
      await artistCollections
        .connect(artist)
        .createCollection(
          "First Collection",
          "Blues",
          "First collection description",
          true,
          "ipfs://avatarFirst"
        );
      await artistCollections
        .connect(artist)
        .createCollection(
          "Second Collection",
          "Rock",
          "Second collection description",
          true,
          "ipfs://avatarSecond"
        );

      // Create tokens in both collections
      const tx1 = await artistCollections
        .connect(artist)
        .createToken(1, ethers.parseEther("1.0"), "ipfs://tokenFirst1");
      const tx2 = await artistCollections
        .connect(artist)
        .createToken(2, ethers.parseEther("1.5"), "ipfs://tokenSecond1");

      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();

      const event1 = findEvent(receipt1, "TokenCreated", artistCollections);
      const event2 = findEvent(receipt2, "TokenCreated", artistCollections);

      const tokenId1 = event1.args[2];
      const tokenId2 = event2.args[2];

      // Decode token IDs
      const collectionId1 = await artistCollections.getCollectionId(tokenId1);
      const tokenNumber1 = await artistCollections.getTokenNumber(tokenId1);

      const collectionId2 = await artistCollections.getCollectionId(tokenId2);
      const tokenNumber2 = await artistCollections.getTokenNumber(tokenId2);

      expect(collectionId1).to.equal(1);
      expect(tokenNumber1).to.equal(1);

      expect(collectionId2).to.equal(2);
      expect(tokenNumber2).to.equal(1);
    });

    it("Should emit TokenCreated event when creating a composition", async function () {
      const { artist, artistCollections } = await loadFixture(
        deployContractsFixture
      );

      // Create a collection
      await artistCollections
        .connect(artist)
        .createCollection(
          "Composition Collection",
          "Ambient",
          "Collection for composition events",
          true,
          "ipfs://avatarCompositionURI"
        );

      // Create a token and expect TokenCreated event instead
      await expect(
        artistCollections
          .connect(artist)
          .createToken(
            1,
            ethers.parseEther("3.0"),
            "ipfs://tokenCompositionURI"
          )
      ).to.emit(artistCollections, "TokenCreated");
    });
  });

  describe("Visibility Management", function () {
    it("Should allow creator to toggle collection visibility", async function () {
      const { artist, artistCollections } = await loadFixture(
        deployContractsFixture
      );

      // Create a collection
      const createCollectionTx = await artistCollections
        .connect(artist)
        .createCollection(
          "Visibility Collection",
          "Pop",
          "Collection for visibility management",
          true, // isPublic
          "ipfs://avatarVisibilityURI"
        );
      const createCollectionReceipt = await createCollectionTx.wait();

      const createCollectionEvent = findEvent(
        createCollectionReceipt,
        "CollectionCreated",
        artistCollections
      );
      const collectionId = createCollectionEvent.args[1]; // collectionId is the second argument

      // Toggle visibility
      await expect(
        artistCollections
          .connect(artist)
          .toggleCollectionVisibility(collectionId)
      )
        .to.emit(artistCollections, "CollectionVisibilityChanged")
        .withArgs(collectionId, false);

      // Check the collection's visibility
      const collection = await artistCollections.collections(collectionId);
      expect(collection.isPublic).to.equal(false);

      // Toggle visibility back
      await expect(
        artistCollections
          .connect(artist)
          .toggleCollectionVisibility(collectionId)
      )
        .to.emit(artistCollections, "CollectionVisibilityChanged")
        .withArgs(collectionId, true);

      const updatedCollection =
        await artistCollections.collections(collectionId);
      expect(updatedCollection.isPublic).to.equal(true);
    });

    it("Should not allow non-creator to toggle collection visibility", async function () {
      const { artist, artistCollections, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Create a collection
      const createCollectionTx = await artistCollections
        .connect(artist)
        .createCollection(
          "Unauthorized Visibility Collection",
          "Reggae",
          "Collection for unauthorized visibility toggle",
          true, // isPublic
          "ipfs://avatarUnauthorizedURI"
        );
      const createCollectionReceipt = await createCollectionTx.wait();

      const createCollectionEvent = findEvent(
        createCollectionReceipt,
        "CollectionCreated",
        artistCollections
      );
      const collectionId = createCollectionEvent.args[1];

      // Attempt to toggle visibility by a non-creator
      await expect(
        artistCollections
          .connect(user1)
          .toggleCollectionVisibility(collectionId)
      ).to.be.revertedWith("Only the artist can call this function");
    });
  });

  describe("Batch Minting", function () {
    it("Should allow batch minting of multiple tokens", async function () {
      const { artist, artistCollections, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Create a collection
      await artistCollections
        .connect(artist)
        .createCollection(
          "Batch Mint Collection",
          "Jazz",
          "Collection for batch minting",
          true,
          "ipfs://avatarBatchURI"
        );

      // Create multiple tokens
      const tokenIds = [];
      const prices = [ethers.parseEther("1.0"), ethers.parseEther("2.0")];
      let totalPrice = ethers.parseEther("0");

      for (let i = 0; i < 2; i++) {
        const tx = await artistCollections
          .connect(artist)
          .createToken(1, prices[i], `ipfs://tokenBatch${i}`);
        const receipt = await tx.wait();

        const event = findEvent(receipt, "TokenCreated", artistCollections);
        tokenIds.push(event.args[2]);
        totalPrice += prices[i];
      }

      // Batch mint
      const mintTx = await artistCollections
        .connect(user1)
        .mintBatch(tokenIds, { value: totalPrice });
      await mintTx.wait();

      // Verify minting
      for (const tokenId of tokenIds) {
        const balance = await artistCollections.balanceOf(
          user1.address,
          tokenId
        );
        expect(balance).to.equal(1);
        expect(await artistCollections.hasMinted(tokenId, user1.address)).to.be
          .true;
      }
    });

    it("Should revert batch minting if payment is incorrect", async function () {
      const { artist, artistCollections, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Create collection
      await artistCollections
        .connect(artist)
        .createCollection(
          "Invalid Payment Collection",
          "Rock",
          "Collection for payment testing",
          true,
          "ipfs://avatarPaymentURI"
        );

      // Create token
      const tx = await artistCollections
        .connect(artist)
        .createToken(1, ethers.parseEther("1.0"), "ipfs://tokenPayment");
      const receipt = await tx.wait();

      const event = findEvent(receipt, "TokenCreated", artistCollections);
      const tokenId = event.args[2];

      // Attempt to mint with incorrect payment
      await expect(
        artistCollections
          .connect(user1)
          .mintBatch([tokenId], { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Incorrect payment amount");
    });
  });

  describe("Payment Distribution", function () {
    it("Should distribute payments correctly when minting", async function () {
      const { artist, artistCollections, user1, treasury } = await loadFixture(
        deployContractsFixture
      );

      // Create collection
      await artistCollections
        .connect(artist)
        .createCollection(
          "Payment Distribution Collection",
          "Blues",
          "Collection for payment distribution",
          true,
          "ipfs://avatarDistributionURI"
        );

      // Create token
      const price = ethers.parseEther("1.0");
      const tx = await artistCollections
        .connect(artist)
        .createToken(1, price, "ipfs://tokenDistribution");
      const receipt = await tx.wait();

      const event = findEvent(receipt, "TokenCreated", artistCollections);
      const tokenId = event.args[2];

      // Track balances before minting
      const artistBalanceBefore = await ethers.provider.getBalance(
        artist.address
      );
      const treasuryBalanceBefore = await ethers.provider.getBalance(
        await treasury.getAddress()
      );

      // Mint token
      await artistCollections
        .connect(user1)
        .mintBatch([tokenId], { value: price });

      // Verify balance changes
      const artistBalanceAfter = await ethers.provider.getBalance(
        artist.address
      );
      const treasuryBalanceAfter = await ethers.provider.getBalance(
        await treasury.getAddress()
      );

      // Platform fee is 2.5% (250 basis points)
      const platformFee = (price * 250n) / 10000n;
      const artistShare = price - platformFee;

      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(
        platformFee
      );
      expect(artistBalanceAfter - artistBalanceBefore).to.equal(artistShare);
    });

    it("Should prevent malicious treasury contracts from receiving payments", async function () {
      const { artist, artistCollections, user1, factory, admin } =
        await loadFixture(deployContractsFixture);

      // Deploy malicious treasury
      const MaliciousTreasury =
        await ethers.getContractFactory("MaliciousTreasury");
      const maliciousTreasury = await MaliciousTreasury.deploy();
      const maliciousTreasuryAddress = await maliciousTreasury.getAddress();

      // Create collection
      await artistCollections
        .connect(artist)
        .createCollection(
          "Malicious Treasury Test",
          "Electronic",
          "Collection for treasury testing",
          true,
          "ipfs://avatarMaliciousURI"
        );

      // Create token
      const tx = await artistCollections
        .connect(artist)
        .createToken(1, ethers.parseEther("1.0"), "ipfs://tokenMalicious");
      const receipt = await tx.wait();

      const event = findEvent(receipt, "TokenCreated", artistCollections);
      const tokenId = event.args[2];

      // Update factory to use malicious treasury
      await factory
        .connect(admin)
        .updatePlatformInfo(maliciousTreasuryAddress, 250);

      // Attempt to mint - should fail due to malicious treasury
      await expect(
        artistCollections
          .connect(user1)
          .mintBatch([tokenId], { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Treasury payment failed");
    });
  });

  describe("Integration Tests", function () {
    it("Should maintain proper ownership and access control across all contracts", async function () {
      const { masterCollections, factory, treasury, admin, treasurer, ceo } =
        await loadFixture(deployContractsFixture);

      const factoryAddress = await factory.getAddress();
      const treasuryAddress = await treasury.getAddress();

      // Check ownership of Factory
      expect(await factory.owner()).to.equal(admin.address);

      // Check roles in Treasury
      expect(
        await treasury.hasRole(
          await treasury.DEFAULT_ADMIN_ROLE(),
          admin.address
        )
      ).to.be.true;
      expect(await treasury.hasRole(await treasury.CEO_ROLE(), admin.address))
        .to.be.true;
      expect(
        await treasury.hasRole(
          await treasury.TREASURER_ROLE(),
          treasurer.address
        )
      ).to.be.true;

      // Rest of the test...
    });
  });
});
/*
  describe("ArtistClonedCollections - Additional Coverage Tests", function () {
    describe("URI Management", function () {
      it("Should set and retrieve correct URI", async function () {
        const { artist, artistCollections } = await loadFixture(
          deployContractsFixture
        );
        const uri = "ipfs://newBaseURI";
        await artistCollections.connect(artist).setURI(uri);
        expect(await artistCollections.uri(1)).to.equal(uri);
      });

      it("Should not allow non-artist to set URI", async function () {
        const { artistCollections, user1 } = await loadFixture(
          deployContractsFixture
        );
        await expect(
          artistCollections.connect(user1).setURI("ipfs://newURI")
        ).to.be.revertedWith("Only the artist can call this function");
      });
    });

    describe("Batch Operations", function () {
      it("Should handle maximum batch minting", async function () {
        const { artist, artistCollections, user1 } = await loadFixture(
          deployContractsFixture
        );
        const maxBatchSize = 20; // Assuming this is your max batch size
        const tokenIds = [];
        const prices = [];

        // Create collection
        await artistCollections
          .connect(artist)
          .createCollection(
            "Max Batch Collection",
            "Various",
            "Testing max batch",
            true,
            "ipfs://maxBatch"
          );

        // Create maximum tokens
        for (let i = 0; i < maxBatchSize; i++) {
          const price = ethers.parseEther("0.1");
          const tx = await artistCollections
            .connect(artist)
            .createToken(1, price, `ipfs://token${i}`);
          const receipt = await tx.wait();
          const event = findEvent(receipt, "TokenCreated", artistCollections);
          tokenIds.push(event.args[2]);
          prices.push(price);
        }

        // Calculate total price
        const totalPrice = prices.reduce((a, b) => a + b, 0n);

        // Mint maximum batch
        await artistCollections
          .connect(user1)
          .mintBatch(tokenIds, { value: totalPrice });

        // Verify all tokens were minted
        for (const tokenId of tokenIds) {
          expect(
            await artistCollections.balanceOf(user1.address, tokenId)
          ).to.equal(1);
        }
      });

      it("Should revert on exceeding maximum batch size", async function () {
        const { artist, artistCollections, user1 } = await loadFixture(
          deployContractsFixture
        );
        const maxBatchSize = 20;
        const tokenIds = Array(maxBatchSize + 1).fill(1);

        await expect(
          artistCollections.connect(user1).mintBatch(tokenIds, { value: 0 })
        ).to.be.revertedWith("Batch size exceeds maximum");
      });
    });

    describe("Edge Cases", function () {
      it("Should handle zero price tokens correctly", async function () {
        const { artist, artistCollections, user1 } = await loadFixture(
          deployContractsFixture
        );

        await artistCollections
          .connect(artist)
          .createCollection(
            "Free Collection",
            "Free",
            "Free tokens",
            true,
            "ipfs://free"
          );

        const tx = await artistCollections
          .connect(artist)
          .createToken(1, 0, "ipfs://freeToken");
        const receipt = await tx.wait();
        const event = findEvent(receipt, "TokenCreated", artistCollections);
        const tokenId = event.args[2];

        await artistCollections
          .connect(user1)
          .mintBatch([tokenId], { value: 0 });
        expect(
          await artistCollections.balanceOf(user1.address, tokenId)
        ).to.equal(1);
      });

      it("Should handle collection deletion correctly", async function () {
        const { artist, artistCollections } = await loadFixture(
          deployContractsFixture
        );

        await artistCollections
          .connect(artist)
          .createCollection(
            "To Delete",
            "Temp",
            "Temporary collection",
            true,
            "ipfs://temp"
          );

        const tx = await artistCollections.connect(artist).deleteCollection(1);
        const receipt = await tx.wait();

        const collection = await artistCollections.collections(1);
        expect(collection.isDeleted).to.be.true;
      });
    });

    describe("Payment Distribution", function () {
      it("Should handle exact payment amounts", async function () {
        const { artist, artistCollections, user1, treasury } =
          await loadFixture(deployContractsFixture);

        await artistCollections
          .connect(artist)
          .createCollection(
            "Exact Payment",
            "Paid",
            "Testing exact payments",
            true,
            "ipfs://paid"
          );

        const exactPrice = ethers.parseEther("1.0");
        const tx = await artistCollections
          .connect(artist)
          .createToken(1, exactPrice, "ipfs://paidToken");
        const receipt = await tx.wait();
        const event = findEvent(receipt, "TokenCreated", artistCollections);
        const tokenId = event.args[2];

        const treasuryBalanceBefore = await ethers.provider.getBalance(
          await treasury.getAddress()
        );

        await artistCollections
          .connect(user1)
          .mintBatch([tokenId], { value: exactPrice });

        const treasuryBalanceAfter = await ethers.provider.getBalance(
          await treasury.getAddress()
        );
        expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(
          (exactPrice * 250n) / 10000n
        );
      });
    });

    describe("Role Management", function () {
      it("Should handle artist role transfer", async function () {
        const { artist, artistCollections, user1 } = await loadFixture(
          deployContractsFixture
        );

        await artistCollections
          .connect(artist)
          .transferArtistRole(user1.address);

        // Verify new artist can create collection
        await expect(
          artistCollections
            .connect(user1)
            .createCollection(
              "New Artist Collection",
              "Transfer",
              "Testing role transfer",
              true,
              "ipfs://transfer"
            )
        ).to.not.be.reverted;

        // Verify old artist cannot create collection
        await expect(
          artistCollections
            .connect(artist)
            .createCollection(
              "Old Artist Collection",
              "Transfer",
              "Should fail",
              true,
              "ipfs://fail"
            )
        ).to.be.revertedWith("Only the artist can call this function");
      });
    });
  });
});
*/
// Helper function for event parsing
function findEvent(receipt, eventName, contract) {
  const event = receipt.logs.find((log) => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed.name === eventName;
    } catch {
      return false;
    }
  });
  return event ? contract.interface.parseLog(event) : null;
}
