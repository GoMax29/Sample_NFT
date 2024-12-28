const { ethers } = require("hardhat");

async function main() {
  // Get signers
  const [deployer, treasurer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Treasury contract
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(deployer.address, treasurer.address);
  await treasury.waitForDeployment();

  console.log("\n=== Treasury Deployment ===");
  console.log("Treasury Address:", await treasury.getAddress());
  console.log("Treasurer Address: (account #1)", treasurer.address);
  console.log("CEO Address: (account #0)", deployer.address);

  // Deploy ArtistClonedCollections contract
  const ArtistClonedCollections = await ethers.getContractFactory(
    "ArtistClonedCollections"
  );
  const artistCollectionsImpl = await ArtistClonedCollections.deploy();
  await artistCollectionsImpl.waitForDeployment();

  console.log("\n=== ArtistClonedCollections Implementation ===");
  console.log(
    "Implementation Address:",
    await artistCollectionsImpl.getAddress()
  );

  // Deploy ArtistClonedFactory contract
  const ArtistClonedFactory = await ethers.getContractFactory(
    "ArtistClonedFactory"
  );
  const factory = await ArtistClonedFactory.deploy(
    await treasury.getAddress(),
    await artistCollectionsImpl.getAddress(),
    1000
  );
  await factory.waitForDeployment();

  console.log("\n=== ArtistClonedFactory Deployment ===");
  console.log("Factory Address:", await factory.getAddress());

  // Return deployed addresses for further use
  return {
    treasury: await treasury.getAddress(),
    artistCollectionsImpl: await artistCollectionsImpl.getAddress(),
    factory: await factory.getAddress(),
  };
}

// Run the script
main()
  .then((deployed) => {
    console.log("\nDeployment successful:", deployed);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
