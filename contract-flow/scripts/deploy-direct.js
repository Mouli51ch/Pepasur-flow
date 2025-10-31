const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Direct deployment script bypassing Hardhat network layer
 * for better timeout handling
 */
async function main() {
  console.log("🚀 Starting direct Pepasur contract deployment...\n");

  // Setup provider with custom fetch options
  const provider = new ethers.JsonRpcProvider(
    process.env.FLOW_EVM_RPC_URL || "https://testnet.evm.nodes.onflow.org",
    {
      chainId: 545,
      name: "flow-testnet",
    },
    {
      staticNetwork: true,
      batchMaxCount: 1,
      polling: true,
      pollingInterval: 4000,
    }
  );

  // Create wallet
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log("📋 Deployment Details:");
  console.log("├─ Deployer:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("├─ Balance:", ethers.formatEther(balance), "FLOW");

  if (balance === 0n) {
    console.error("❌ Error: Deployer has zero balance!");
    process.exit(1);
  }

  // Load contract artifact
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "Pepasur.sol",
    "Pepasur.json"
  );

  if (!fs.existsSync(artifactPath)) {
    console.error("❌ Contract artifact not found. Run 'npm run compile' first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  console.log("└─ Contract: Pepasur.sol\n");

  console.log("📦 Deploying contract...");

  // Create contract factory
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  try {
    // Deploy with explicit gas settings
    const contract = await factory.deploy({
      gasLimit: 5000000, // 5M gas
      gasPrice: ethers.parseUnits("1", "gwei"),
    });

    console.log("⏳ Waiting for deployment transaction...");
    console.log("├─ Transaction Hash:", contract.deploymentTransaction().hash);

    // Wait for deployment with retries
    let receipt = null;
    let retries = 5;

    while (retries > 0 && !receipt) {
      try {
        receipt = await contract.deploymentTransaction().wait(1);
        break;
      } catch (error) {
        retries--;
        if (retries > 0) {
          console.log(`⏳ Retrying... (${retries} attempts left)`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          throw error;
        }
      }
    }

    const contractAddress = await contract.getAddress();

    console.log("✅ Contract deployed successfully!\n");

    console.log("📊 Deployment Summary:");
    console.log("├─ Contract Address:", contractAddress);
    console.log("├─ Transaction Hash:", receipt.hash);
    console.log("├─ Block Number:", receipt.blockNumber);
    console.log("├─ Gas Used:", receipt.gasUsed.toString());
    console.log(
      "└─ Total Cost:",
      ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
      "FLOW\n"
    );

    // Get initial contract state
    const config = await contract.getConfig();
    const nextGameId = await contract.getNextGameId();

    console.log("🔧 Initial Contract State:");
    console.log("├─ Admin:", config.admin);
    console.log("├─ Server Signer:", config.serverSigner);
    console.log("├─ Fee Recipient:", config.feeRecipient);
    console.log("├─ House Cut:", config.houseCutBps.toString(), "bps");
    console.log("├─ Initialized:", config.initialized);
    console.log("└─ Next Game ID:", nextGameId.toString(), "\n");

    // Save deployment info
    const deploymentInfo = {
      network: "flowTestnet",
      chainId: "545",
      contractAddress: contractAddress,
      deployerAddress: wallet.address,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: receipt.gasPrice.toString(),
      timestamp: new Date().toISOString(),
      config: {
        admin: config.admin,
        serverSigner: config.serverSigner,
        feeRecipient: config.feeRecipient,
        houseCutBps: config.houseCutBps.toString(),
        initialized: config.initialized,
      },
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    const filename = `flowTestnet-${Date.now()}.json`;
    const filepath = path.join(deploymentsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

    const latestPath = path.join(deploymentsDir, "flowTestnet-latest.json");
    fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

    console.log("💾 Deployment info saved to:");
    console.log("├─", filepath);
    console.log("└─", latestPath, "\n");

    console.log("📝 Next Steps:");
    console.log("1. Initialize contract:");
    console.log("   npm run initialize");
    console.log("\n2. View on block explorer:");
    console.log("   https://evm-testnet.flowscan.io/address/" + contractAddress);
    console.log("\n3. Update backend .env:");
    console.log("   PEPASUR_CONTRACT_ADDRESS=" + contractAddress);
    console.log("   SERVER_PRIVATE_KEY=0xb09b005ee8bc654c80ab760f163a785f0318bb164384f6cdfe10c5c321717b95");
    console.log("\n4. Update frontend .env:");
    console.log("   NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=" + contractAddress);

    return { contractAddress, deploymentInfo };
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
