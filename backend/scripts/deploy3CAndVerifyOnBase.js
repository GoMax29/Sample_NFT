const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  // Get signers
  const [ceo, treasurer] = await ethers.getSigners();

  // Check balances before deployment
  console.log("CEO Address:", ceo.address);
  console.log(
    "CEO Balance:",
    ethers.formatEther(await ceo.provider.getBalance(ceo.address))
  );

  console.log("Treasurer Address:", treasurer.address);
  console.log(
    "Treasurer Balance:",
    ethers.formatEther(await treasurer.provider.getBalance(treasurer.address))
  );

  console.log("Deploying contracts with CEO account:", ceo.address);
  console.log("Treasurer account:", treasurer.address);

  // Deploy Treasury contract
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(ceo.address, treasurer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();

  console.log("\n=== Treasury Deployment ===");
  console.log("Treasury Address:", treasuryAddress);

  // Deploy ArtistClonedCollections contract
  const ArtistClonedCollections = await ethers.getContractFactory(
    "ArtistClonedCollections"
  );
  const artistCollectionsImpl = await ArtistClonedCollections.deploy();
  await artistCollectionsImpl.waitForDeployment();
  const artistCollectionsImplAddress = await artistCollectionsImpl.getAddress();

  console.log("\n=== ArtistClonedCollections Implementation ===");
  console.log("Implementation Address:", artistCollectionsImplAddress);

  // Deploy ArtistClonedFactory contract
  const ArtistClonedFactory = await ethers.getContractFactory(
    "ArtistClonedFactory"
  );
  const factory = await ArtistClonedFactory.deploy(
    treasuryAddress,
    artistCollectionsImplAddress,
    1000
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("\n=== ArtistClonedFactory Deployment ===");
  console.log("Factory Address:", factoryAddress);

  // Wait for 30 seconds for all deployments to be mined
  console.log("\nWaiting for 30 seconds before verification...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Verify all contracts
  console.log("\nVerifying contracts...");

  try {
    await hre.run("verify:verify", {
      address: treasuryAddress,
      contract: "contracts/Treasury.sol:Treasury",
      constructorArguments: [ceo.address, treasurer.address],
    });
    console.log("Treasury contract verified successfully");
  } catch (error) {
    console.error("Treasury verification failed:", error);
  }

  try {
    await hre.run("verify:verify", {
      address: artistCollectionsImplAddress,
      contract: "contracts/ArtistClonedCollections.sol:ArtistClonedCollections",
      constructorArguments: [],
    });
    console.log("ArtistClonedCollections contract verified");
  } catch (error) {
    console.error("ArtistClonedCollections verification failed:", error);
  }

  try {
    await hre.run("verify:verify", {
      address: factoryAddress,
      contract: "contracts/ArtistClonedFactory.sol:ArtistClonedFactory",
      constructorArguments: [
        treasuryAddress,
        artistCollectionsImplAddress,
        1000,
      ],
    });
    console.log("ArtistClonedFactory contract verified");
  } catch (error) {
    console.error("ArtistClonedFactory verification failed:", error);
  }

  return {
    treasury: treasuryAddress,
    artistCollectionsImpl: artistCollectionsImplAddress,
    factory: factoryAddress,
  };
}

main()
  .then((deployed) => {
    console.log("\nDeployment successful:", deployed);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
