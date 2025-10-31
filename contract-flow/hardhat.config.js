require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable IR-based code generation for better optimization
    },
  },

  networks: {
    // Flow EVM Testnet
    flowTestnet: {
      url: process.env.FLOW_EVM_RPC_URL || "https://testnet.evm.nodes.onflow.org",
      chainId: 545,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      gasPrice: 1000000000, // 1 gwei
      gas: 10000000, // 10M gas limit
      timeout: 180000, // 180 seconds timeout
      httpHeaders: {
        "Content-Type": "application/json"
      }
    },

    // Local Hardhat Network (for testing)
    hardhat: {
      chainId: 31337,
      forking: process.env.FORK_FLOW_TESTNET === "true"
        ? {
            url: process.env.FLOW_EVM_RPC_URL || "https://testnet.evm.nodes.onflow.org",
            blockNumber: parseInt(process.env.FORK_BLOCK_NUMBER || "0") || undefined,
          }
        : undefined,
    },

    // Localhost (for local Hardhat node)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },

  // Etherscan verification configuration
  etherscan: {
    apiKey: {
      flowTestnet: process.env.FLOWSCAN_API_KEY || "no-api-key-needed",
    },
    customChains: [
      {
        network: "flowTestnet",
        chainId: 545,
        urls: {
          apiURL: "https://evm-testnet.flowscan.io/api",
          browserURL: "https://evm-testnet.flowscan.io",
        },
      },
    ],
  },

  // Gas reporter configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    outputFile: process.env.GAS_REPORT_FILE || undefined,
    noColors: process.env.CI === "true",
  },

  // Paths configuration
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // Mocha timeout for tests
  mocha: {
    timeout: 120000, // 2 minutes
  },
};
