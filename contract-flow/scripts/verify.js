const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Verify Pepasur contract on FlowScan block explorer
 *
 * Usage:
 *   npx hardhat run scripts/verify.js --network flowTestnet
 *
 * Or use hardhat verify directly:
 *   npx hardhat verify --network flowTestnet <CONTRACT_ADDRESS>
 */
async function main() {
  console.log("🔍 Verifying Pepasur contract on FlowScan...\n");

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

  console.log("📋 Verification Details:");
  console.log("├─ Network:", hre.network.name);
  console.log("├─ Contract:", contractAddress);
  console.log("└─ Explorer: https://evm-testnet.flowscan.io\n");

  try {
    console.log("📤 Submitting verification...");

    // Verify contract (no constructor arguments needed)
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });

    console.log("\n✅ Contract verified successfully!\n");

    // Update deployment info
    deploymentInfo.verified = true;
    deploymentInfo.verifiedAt = new Date().toISOString();
    fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

    console.log("📊 View verified contract:");
    console.log("https://evm-testnet.flowscan.io/address/" + contractAddress + "#code\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified!\n");
      console.log("📊 View contract:");
      console.log("https://evm-testnet.flowscan.io/address/" + contractAddress + "#code\n");
    } else {
      console.error("❌ Verification failed:", error.message);
      console.log("\nYou can try manual verification:");
      console.log("1. Go to: https://evm-testnet.flowscan.io/address/" + contractAddress + "#code");
      console.log("2. Click 'Verify and Publish'");
      console.log("3. Select 'Solidity (Single file)'");
      console.log("4. Compiler version: 0.8.20");
      console.log("5. Optimization: Yes (200 runs)");
      console.log("6. Paste the flattened contract code\n");

      throw error;
    }
  }
}

// Execute verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
