const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy Pepasur contract to Flow EVM Testnet
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network flowTestnet
 */
async function main() {
  console.log("🚀 Starting Pepasur contract deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await hre.ethers.provider.getBalance(deployerAddress);

  console.log("📋 Deployment Details:");
  console.log("├─ Network:", hre.network.name);
  console.log("├─ Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("├─ Deployer:", deployerAddress);
  console.log("└─ Balance:", hre.ethers.formatEther(balance), "FLOW\n");

  // Check balance
  if (balance === 0n) {
    console.error("❌ Error: Deployer has zero balance!");
    console.log("Get testnet FLOW from: https://testnet-faucet.onflow.org/");
    process.exit(1);
  }

  // Deploy contract
  console.log("📦 Deploying Pepasur contract...");
  const Pepasur = await hre.ethers.getContractFactory("Pepasur");
  const pepasur = await Pepasur.deploy();

  await pepasur.waitForDeployment();
  const contractAddress = await pepasur.getAddress();

  console.log("✅ Contract deployed successfully!\n");

  // Get deployment transaction
  const deployTx = pepasur.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("📊 Deployment Summary:");
  console.log("├─ Contract Address:", contractAddress);
  console.log("├─ Transaction Hash:", deployTx.hash);
  console.log("├─ Block Number:", receipt.blockNumber);
  console.log("├─ Gas Used:", receipt.gasUsed.toString());
  console.log("├─ Gas Price:", hre.ethers.formatUnits(deployTx.gasPrice, "gwei"), "gwei");
  console.log("└─ Total Cost:", hre.ethers.formatEther(receipt.gasUsed * deployTx.gasPrice), "FLOW\n");

  // Get initial contract state
  const config = await pepasur.getConfig();
  const nextGameId = await pepasur.getNextGameId();

  console.log("🔧 Initial Contract State:");
  console.log("├─ Admin:", config.admin);
  console.log("├─ Server Signer:", config.serverSigner);
  console.log("├─ Fee Recipient:", config.feeRecipient);
  console.log("├─ House Cut:", config.houseCutBps, "bps (", config.houseCutBps / 100, "%)");
  console.log("├─ Initialized:", config.initialized);
  console.log("└─ Next Game ID:", nextGameId.toString(), "\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    contractAddress: contractAddress,
    deployerAddress: deployerAddress,
    transactionHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    gasPrice: deployTx.gasPrice.toString(),
    timestamp: new Date().toISOString(),
    config: {
      admin: config.admin,
      serverSigner: config.serverSigner,
      feeRecipient: config.feeRecipient,
      houseCutBps: config.houseCutBps,
      initialized: config.initialized,
    },
  };

  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

  // Also save as latest
  const latestPath = path.join(deploymentsDir, `${hre.network.name}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("💾 Deployment info saved to:");
  console.log("├─", filepath);
  console.log("└─", latestPath, "\n");

  // Next steps
  console.log("📝 Next Steps:");
  console.log("1. Initialize contract with server signer:");
  console.log("   npx hardhat run scripts/initialize.js --network", hre.network.name);
  console.log("\n2. Verify contract on explorer:");
  console.log("   npx hardhat verify --network", hre.network.name, contractAddress);
  console.log("\n3. Update backend .env with contract address:");
  console.log("   PEPASUR_CONTRACT_ADDRESS=" + contractAddress);
  console.log("\n4. Update frontend .env with contract address:");
  console.log("   NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=" + contractAddress);
  console.log("\n5. View on block explorer:");
  console.log("   https://evm-testnet.flowscan.io/address/" + contractAddress);

  return {
    contractAddress,
    deploymentInfo,
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
