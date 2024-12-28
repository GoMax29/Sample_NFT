require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const PK = process.env.PK || "";
const RPC_URL = process.env.INFURA_URL || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC || "";
const CEO_PRIVATE_KEY = process.env.CEO_PRIVATE_KEY || "";
const TREASURER_PRIVATE_KEY = process.env.TREASURER_PRIVATE_KEY || "";
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        // remove this 200 if it's not needed , optimizer is not working..
        runs: 200,
      },
    },
  },
  networks: {
    "base-sepolia": {
      url: BASE_SEPOLIA_RPC,
      accounts: [CEO_PRIVATE_KEY, TREASURER_PRIVATE_KEY],
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
      "base-sepolia": BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};
