const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy PepasurSimple contract
 */
async function main() {
  console.log("🚀 Deploying PepasurSimple contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "FLOW\n");

  // Deploy
  const PepasurSimple = await hre.ethers.getContractFactory("PepasurSimple");
  const pepasur = await PepasurSimple.deploy();

  await pepasur.waitForDeployment();
  const address = await pepasur.getAddress();

  console.log("✅ Contract deployed!");
  console.log("Address:", address);
  console.log("Explorer: https://evm-testnet.flowscan.io/address/" + address);

  // Get initial state
  const owner = await pepasur.owner();
  const houseCut = await pepasur.houseCutBps();
  const nextGameId = await pepasur.nextGameId();

  console.log("\n📊 Contract State:");
  console.log("├─ Owner:", owner);
  console.log("├─ House Cut:", houseCut.toString(), "bps (", Number(houseCut) / 100, "%)");
  console.log("└─ Next Game ID:", nextGameId.toString());

  // Save deployment
  const deploymentInfo = {
    network: hre.network.name,
    address: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    owner: owner,
    houseCut: houseCut.toString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.writeFileSync(
    path.join(deploymentsDir, "simple-latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📝 Next Steps:");
  console.log("1. Update backend .env:");
  console.log("   PEPASUR_CONTRACT_ADDRESS=" + address);
  console.log("\n2. Update frontend .env:");
  console.log("   NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=" + address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
