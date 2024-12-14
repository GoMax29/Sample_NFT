const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const sinon = require("sinon");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { AddressZero } = require("@ethersproject/constants");

describe("Test ArtistClonedFactory contract", function () {
  let Factory;
  let Master;

  let owner, addr1, addr2, addr3, addr4, addr5, addr6;

  // Deployment Fixtures
  async function deploy_Master_Fix() {
    const ArtistClonedCollections = await ethers.getContractFactory(
      "ArtistClonedCollections"
    );
    Master = await ArtistClonedCollections.deploy();
    await Master.waitForDeployment();
    const masterAddress = await Master.getAddress();
    return masterAddress;
  }

  async function deploy_Factory_Fix() {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6] =
      await ethers.getSigners();
    const platformAddress = addr6.address;
    const platformFeePercentage = 250; // 2.5%
    const masterAddress = await deploy_Master_Fix(); // Deploy master contract

    // Log the addresses to debug
    console.log("Platform Address:", platformAddress);
    console.log("Master Address:", masterAddress);

    Factory = await ethers.deployContract("ArtistClonedFactory", [
      platformAddress,
      masterAddress, // Use the deployed master address
      platformFeePercentage,
    ]);
    return {
      Factory,
      owner,
      addr1,
      addr2,
      addr3,
      addr4,
      addr5,
      addr6,
      platformAddress,
      platformFeePercentage,
    };
  }

  async function deploy_Factory_With_Registered_Artist_Fix() {
    let { Factory, owner, addr1, addr2 } =
      await loadFixture(deploy_Factory_Fix);
    const artistName = "Artist #1";
    const musicStyles = ["Rock", "Pop"];
    await Factory.connect(addr1).deployArtistClonedCollections(
      artistName,
      musicStyles
    );
    return { Factory, owner, addr1, artistName, musicStyles };
  }

  async function deploy_Factory_With_Multiple_Registered_Artists_Fix() {
    let { Factory, owner, addr1, addr2, addr3 } =
      await loadFixture(deploy_Factory_Fix);
    const artists = [
      { name: "Artist 1", styles: ["Rock"] },
      { name: "Artist 2", styles: ["Pop"] },
      { name: "Artist 3", styles: ["Jazz", "Blues"] },
    ];

    await Factory.connect(addr1).deployArtistClonedCollections(
      artists[0].name,
      artists[0].styles
    );
    await Factory.connect(addr2).deployArtistClonedCollections(
      artists[1].name,
      artists[1].styles
    );
    await Factory.connect(addr3).deployArtistClonedCollections(
      artists[2].name,
      artists[2].styles
    );

    return { Factory, owner, addr1, addr2, addr3, addr4, artists };
  }

  async function deploy_Factory_With_Invalid_Platform_Address_Fix() {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6] =
      await ethers.getSigners();
    const platformAddress = "0x0000000000000000000000000000000000000000"; // Use address 0
    const platformFeePercentage = 250; // 2.5%
    const masterAddress = await deploy_Master_Fix(); // Deploy master contract
    return ethers.deployContract("ArtistClonedFactory", [
      platformAddress, // Use address 0
      masterAddress,
      platformFeePercentage,
    ]);
  }

  async function deploy_Factory_With_Invalid_Master_Address_Fix() {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6] =
      await ethers.getSigners();
    const platformAddress = addr6.address;
    const platformFeePercentage = 250; // 2.5%
    const masterAddress = "0x0000000000000000000000000000000000000000"; // address 0
    return ethers.deployContract("ArtistClonedFactory", [
      platformAddress,
      masterAddress, // Use address 0
      platformFeePercentage,
    ]);
  }

  async function deploy_Factory_With_Invalid_Platform_Fee_Percentage_Fix() {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6] =
      await ethers.getSigners();
    const platformAddress = addr6.address;
    const platformFeePercentage = 10100; // 101%
    const masterAddress = await deploy_Master_Fix(); // Deploy master contract
    return ethers.deployContract("ArtistClonedFactory", [
      platformAddress,
      masterAddress,
      platformFeePercentage,
    ]);
  }

  // ::::::::::::: TESTING INITIALIZATION ::::::::::::: //
  describe("Initialization", function () {
    it("Should deploy the contract and get the owner", async function () {
      // Test contract deployment and owner
      let { Factory, owner } = await loadFixture(deploy_Factory_Fix);
      expect(await Factory.owner()).to.equal(owner.address);
    });

    it("Should NOT deploy the contract if platform address is NOT a valid ethereum address", async function () {
      await expect(
        deploy_Factory_With_Invalid_Platform_Address_Fix()
      ).to.be.revertedWith("Invalid platform address");
    });

    it("Should NOT deploy the contract if master artist collections address is NOT a valid ethereum address", async function () {
      await expect(
        deploy_Factory_With_Invalid_Master_Address_Fix()
      ).to.be.revertedWith("Invalid master artist collections address");
    });

    it("Should NOT deploy the contract if platform fee percentage is greater than 100%", async function () {
      await expect(
        deploy_Factory_With_Invalid_Platform_Fee_Percentage_Fix()
      ).to.be.revertedWith("Fee percentage must be less than or equal to 100%");
    });

    it("Should deploy the contract and get the owner", async function () {
      // Test contract deployment and owner
      let { Factory, owner } = await loadFixture(deploy_Factory_Fix);
      expect(await Factory.owner()).to.equal(owner.address);
      console.log("Factory owner:", await Factory.owner());
    });
  });

  // ::::::::::::: TESTING PLATFORM INFO ::::::::::::: //

  describe("Platform Info Management", function () {
    it("Should allow owner to update platform info", async function () {
      // Test updating platform address and fee percentage
      let { Factory, owner, addr5 } = await loadFixture(deploy_Factory_Fix);
      const newPlatformAddress = addr5.address; // Use .address to get the string representation
      const newPlatformFeePercentage = 500; // 5%
      await Factory.connect(owner).updatePlatformInfo(
        newPlatformAddress,
        newPlatformFeePercentage
      );
      const platformInfo = await Factory.platformInfo();
      expect(platformInfo.platformAddress).to.equal(newPlatformAddress);
      expect(platformInfo.platformFeePercentage).to.equal(
        newPlatformFeePercentage
      );
    });

    it("Should not allow non-owner to update platform info", async function () {
      // Test access control for platform info update
      let { Factory, owner, addr5 } = await loadFixture(deploy_Factory_Fix);
      const newPlatformAddress = addr5.address; // Use .address to get the string representation
      const newPlatformFeePercentage = 500; // 5%
      await expect(
        Factory.connect(addr5).updatePlatformInfo(
          newPlatformAddress,
          newPlatformFeePercentage
        )
      )
        .to.be.revertedWithCustomError(Factory, "OwnableUnauthorizedAccount")
        .withArgs(addr5.address);
      console.log("Owner: ", owner.address);
      console.log("address of the caller: ", addr5.address);
    });
  });

  // ::::::::::::: TESTING ARTIST REGISTRATION ::::::::::::: //
  describe("Artist Collections Deployment", function () {
    it("Should allow artist to deploy collections contract successfully", async function () {
      // Arrange: Load the fixture to get the Factory and addresses
      const { Factory, addr1 } = await loadFixture(deploy_Factory_Fix);

      const artistName = "Artist #1";
      const musicStyles = ["Rock", "Pop"];

      // Act: Deploy the artist collections contract
      const tx = await Factory.connect(addr1).deployArtistClonedCollections(
        artistName,
        musicStyles
      );
      await tx.wait(); // Wait for the transaction to be mined

      // Get the clone address directly from the mapping
      const cloneAddress = await Factory.artistToCollections(addr1.address);

      // Assert: Check that the returned address is valid
      expect(cloneAddress).to.not.equal(AddressZero);

      // Retrieve artist info using the getArtistInfo function
      const artistInfo = await Factory.getArtistInfo(addr1.address);
      console.log("Full artistInfo: ", artistInfo);
      console.log("Artist Name: ", artistInfo.name);
      console.log("Music Styles Length: ", artistInfo.musicStyles.length);
      console.log("Music Styles: ", artistInfo.musicStyles);

      // Additional assertions to verify music styles
      expect(artistInfo.name).to.equal(artistName);
      expect(artistInfo.musicStyles.length).to.equal(musicStyles.length);
      expect(artistInfo.musicStyles[0]).to.equal(musicStyles[0]);
      expect(artistInfo.musicStyles[1]).to.equal(musicStyles[1]);
    });

    it("Should prevent artist from deploying multiple collections", async function () {
      // Test preventing duplicate collections for the same artist
      const { Factory, addr1 } = await loadFixture(
        deploy_Factory_With_Registered_Artist_Fix
      );
      await expect(
        Factory.connect(addr1).deployArtistClonedCollections("Artist #1", [
          "Rock",
          "Pop",
        ])
      ).to.be.revertedWith("Artist already has a collections contract");
    });

    it("Should emit correct events on artist collections deployment", async function () {
      // Ensure the artist is registered first
      const { Factory, addr1 } = await loadFixture(deploy_Factory_Fix);

      const artistName = "Artist #1";
      const musicStyles = ["Rock", "Pop"];

      // Act: Deploy the artist collections contract
      const tx = await Factory.connect(addr1).deployArtistClonedCollections(
        artistName,
        musicStyles
      );

      const blockTimestamp = (await ethers.provider.getBlock("latest"))
        .timestamp;

      // Get the clone address
      const cloneAddress = await Factory.artistToCollections(addr1.address);

      await expect(tx)
        .to.emit(Factory, "ArtistRegistered")
        .withArgs(
          addr1.address, // artist address
          artistName, // artist name
          blockTimestamp // precise timestamp from the block
        )
        .and.to.emit(Factory, "ArtistCollectionsDeployed")
        .withArgs(addr1.address, cloneAddress); // Use the actual clone address
    });

    it("Should prevent registration with empty artist name", async function () {
      // Test validation for empty artist name
      const { Factory, addr1 } = await loadFixture(deploy_Factory_Fix);
      await expect(
        Factory.connect(addr1).deployArtistClonedCollections("", [
          "Rock",
          "Pop",
        ])
      ).to.be.revertedWith("Artist name cannot be empty");
    });

    it("Should prevent registration without music styles", async function () {
      // Test validation for empty music styles array
      const { Factory, addr1 } = await loadFixture(deploy_Factory_Fix);
      await expect(
        Factory.connect(addr1).deployArtistClonedCollections("Artist #1", [])
      ).to.be.revertedWith("Must provide at least one music style");
    });

    it("Should increment the total number of registered artists", async function () {
      // Test that the registeredArtists array is updated
      const { Factory, addr1 } = await loadFixture(deploy_Factory_Fix);
      const artistName = "Artist #1";
      const musicStyles = ["Rock", "Pop"];
      await Factory.connect(addr1).deployArtistClonedCollections(
        artistName,
        musicStyles
      );
      const totalArtists = await Factory.getTotalArtists();
      expect(totalArtists).to.equal(1);
    });
  });

  // ::::::::::::: TESTING ARTIST INFO RETRIEVAL ::::::::::::: //
  describe("Artist Information Retrieval", function () {
    it("Should retrieve artist information correctly", async function () {
      // Test getArtistInfo function
      const { Factory, addr1 } = await loadFixture(
        deploy_Factory_With_Registered_Artist_Fix
      );
      const artistInfo = await Factory.getArtistInfo(addr1.address);
      expect(artistInfo.name).to.equal("Artist #1");
      expect(artistInfo.musicStyles).to.deep.equal(["Rock", "Pop"]);
    });

    it("Should return total number of registered artists", async function () {
      // Test getTotalArtists function
      const { Factory, addr1 } = await loadFixture(
        deploy_Factory_With_Registered_Artist_Fix
      );
      const totalArtists = await Factory.getTotalArtists();
      expect(totalArtists).to.equal(1);
    });

    it("Should retrieve artist collections contract address", async function () {
      // Test getArtistCollections function
      const { Factory, addr1 } = await loadFixture(
        deploy_Factory_With_Registered_Artist_Fix
      );
      const cloneAddress = await Factory.artistToCollections(addr1.address);
      expect(cloneAddress).to.not.equal(AddressZero);
      expect(await Factory.getArtistCollections(addr1.address)).to.equal(
        cloneAddress
      );
    });
  });
});
