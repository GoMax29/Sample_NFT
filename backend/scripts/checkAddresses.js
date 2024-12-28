const { ethers } = require("hardhat");

async function main() {
  const [ceo, treasurer] = await ethers.getSigners();

  console.log("\nFrom Hardhat Signers:");
  console.log("CEO Address:", ceo.address);
  console.log("Treasurer Address:", treasurer.address);

  // Also verify the private keys directly
  const ceoPK = process.env.CEO_PRIVATE_KEY;
  const treasurerPK = process.env.TREASURER_PRIVATE_KEY;

  console.log("\nPrivate Keys from .env:");
  console.log("CEO Private Key:", ceoPK);
  console.log("Treasurer Private Key:", treasurerPK);

  // Create wallets from private keys
  const ceoWallet = new ethers.Wallet(ceoPK);
  const treasurerWallet = new ethers.Wallet(treasurerPK);

  console.log("\nDerived Addresses from Private Keys:");
  console.log("CEO Derived Address:", ceoWallet.address);
  console.log("Treasurer Derived Address:", treasurerWallet.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
