const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Initialize Pepasur contract after deployment
 *
 * This script:
 * 1. Loads the deployed contract address
 * 2. Sets the server signer address
 * 3. Sets the fee recipient address
 * 4. Marks the contract as initialized
 *
 * Usage:
 *   npx hardhat run scripts/initialize.js --network flowTestnet
 */
async function main() {
  console.log("🔧 Initializing Pepasur contract...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log("📋 Initialization Details:");
  console.log("├─ Network:", hre.network.name);
  console.log("└─ Admin:", deployerAddress, "\n");

  // Load deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const latestPath = path.join(deploymentsDir, `${hre.network.name}-latest.json`);

  if (!fs.existsSync(latestPath)) {
    console.error("❌ Error: No deployment found for network", hre.network.name);
    console.log("Please deploy the contract first:");
    console.log("  npx hardhat run scripts/deploy.js --network", hre.network.name);
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(latestPath, "utf8"));
  const contractAddress = deploymentInfo.contractAddress;

  console.log("📦 Contract Address:", contractAddress, "\n");

  // Get contract instance
  const Pepasur = await hre.ethers.getContractFactory("Pepasur");
  const pepasur = Pepasur.attach(contractAddress);

  // Check if already initialized
  const config = await pepasur.getConfig();
  if (config.initialized) {
    console.log("⚠️  Contract already initialized!");
    console.log("Current configuration:");
    console.log("├─ Server Signer:", config.serverSigner);
    console.log("├─ Fee Recipient:", config.feeRecipient);
    console.log("└─ House Cut:", config.houseCutBps, "bps\n");
    return;
  }

  // Get addresses from environment variables
  const serverSignerAddress = process.env.SERVER_SIGNER_ADDRESS;
  const feeRecipientAddress = process.env.FEE_RECIPIENT_ADDRESS || deployerAddress;

  if (!serverSignerAddress || serverSignerAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ Error: SERVER_SIGNER_ADDRESS not set in .env file");
    console.log("\nPlease set the server signer address:");
    console.log("1. Generate a new wallet for the backend server");
    console.log("2. Add SERVER_SIGNER_ADDRESS=0x... to .env");
    console.log("3. Run this script again\n");
    process.exit(1);
  }

  console.log("🔑 Initialization Parameters:");
  console.log("├─ Server Signer:", serverSignerAddress);
  console.log("└─ Fee Recipient:", feeRecipientAddress, "\n");

  // Prompt for confirmation
  console.log("⚠️  Please confirm the addresses above are correct!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

  // Wait 5 seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Initialize contract
  console.log("📤 Sending initialization transaction...");
  const tx = await pepasur.initialize(serverSignerAddress, feeRecipientAddress);

  console.log("⏳ Waiting for confirmation...");
  console.log("├─ Transaction Hash:", tx.hash);

  const receipt = await tx.wait();

  console.log("└─ Confirmed in block:", receipt.blockNumber, "\n");

  // Verify initialization
  const newConfig = await pepasur.getConfig();

  console.log("✅ Contract initialized successfully!\n");

  console.log("📊 Updated Configuration:");
  console.log("├─ Admin:", newConfig.admin);
  console.log("├─ Server Signer:", newConfig.serverSigner);
  console.log("├─ Fee Recipient:", newConfig.feeRecipient);
  console.log("├─ House Cut:", newConfig.houseCutBps, "bps (", newConfig.houseCutBps / 100, "%)");
  console.log("└─ Initialized:", newConfig.initialized, "\n");

  // Update deployment info
  deploymentInfo.config = {
    admin: newConfig.admin,
    serverSigner: newConfig.serverSigner,
    feeRecipient: newConfig.feeRecipient,
    houseCutBps: newConfig.houseCutBps,
    initialized: newConfig.initialized,
  };
  deploymentInfo.initializationTxHash = tx.hash;
  deploymentInfo.initializedAt = new Date().toISOString();

  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("💾 Deployment info updated\n");

  // Next steps
  console.log("📝 Next Steps:");
  console.log("1. Update backend .env with server private key:");
  console.log("   SERVER_PRIVATE_KEY=0x... (matching", serverSignerAddress, ")");
  console.log("\n2. Update backend .env with contract address:");
  console.log("   PEPASUR_CONTRACT_ADDRESS=" + contractAddress);
  console.log("\n3. Test backend signing:");
  console.log("   cd ../backend && npm run test");
  console.log("\n4. View contract on explorer:");
  console.log("   https://evm-testnet.flowscan.io/address/" + contractAddress);
}

// Execute initialization
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Initialization failed:", error);
    process.exit(1);
  });
