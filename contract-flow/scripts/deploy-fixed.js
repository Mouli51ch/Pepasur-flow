const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy PepasurSimpleFixed contract with proper 4-player support
 */
async function main() {
  console.log("🚀 Deploying PepasurSimpleFixed contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "FLOW\n");

  // Deploy the fixed contract
  const PepasurSimpleFixed = await hre.ethers.getContractFactory("PepasurSimpleFixed");
  const pepasur = await PepasurSimpleFixed.deploy();

  await pepasur.waitForDeployment();
  const address = await pepasur.getAddress();

  console.log("✅ Fixed Contract deployed!");
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

  console.log("\n🎮 Fixed Features:");
  console.log("├─ ✅ Proper 4-player support");
  console.log("├─ ✅ LOBBY → READY → IN_PROGRESS flow");
  console.log("├─ ✅ Manual game start");
  console.log("├─ ✅ Auto-start when maxPlayers reached");
  console.log("├─ ✅ 98% winners, 2% house cut");
  console.log("└─ ✅ Better error handling");

  // Save deployment
  const deploymentInfo = {
    network: hre.network.name,
    contractName: "PepasurSimpleFixed",
    address: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    owner: owner,
    houseCut: houseCut.toString(),
    features: [
      "4-player support",
      "Manual game start",
      "Proper status flow",
      "Enhanced validation"
    ]
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, "fixed-latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📝 Next Steps:");
  console.log("1. Update backend .env:");
  console.log("   PEPASUR_CONTRACT_ADDRESS=" + address);
  console.log("\n2. Update frontend .env:");
  console.log("   NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=" + address);
  console.log("\n3. Update frontend ABI to include new functions:");
  console.log("   - createGame(stakeAmount, minPlayers, maxPlayers)");
  console.log("   - startGame(gameId)");
  console.log("   - canJoinGame(gameId)");
  console.log("   - getGameStats(gameId)");
  
  console.log("\n🎯 Test with 4 players:");
  console.log("   minPlayers: 4, maxPlayers: 4");
  console.log("   Stake: 0.001 FLOW each");
  console.log("   Total pool: 0.004 FLOW");
  console.log("   Winners get: 0.00392 FLOW (98%)");
  console.log("   House gets: 0.00008 FLOW (2%)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });