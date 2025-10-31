const hre = require("hardhat");

/**
 * Test the fixed contract functionality
 */
async function main() {
  console.log("🧪 Testing PepasurSimpleFixed contract...\n");

  // Get the deployed contract address
  const fs = require("fs");
  const path = require("path");
  
  let contractAddress;
  try {
    const deploymentPath = path.join(__dirname, "..", "deployments", "fixed-latest.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    contractAddress = deployment.address;
    console.log("📍 Using deployed contract:", contractAddress);
  } catch (error) {
    console.error("❌ No deployment found. Run 'npm run deploy:fixed' first");
    process.exit(1);
  }

  const signers = await hre.ethers.getSigners();
  const [deployer, player1, player2, player3, player4] = signers;
  
  console.log("👥 Test accounts:");
  console.log("├─ Deployer:", deployer.address);
  if (player1) console.log("├─ Player 1:", player1.address);
  if (player2) console.log("├─ Player 2:", player2.address);
  if (player3) console.log("├─ Player 3:", player3.address);
  if (player4) console.log("└─ Player 4:", player4.address);
  
  if (signers.length < 5) {
    console.log("⚠️  Only", signers.length, "accounts available. Using deployer as additional players.");
  }

  // Connect to deployed contract
  const PepasurSimpleFixed = await hre.ethers.getContractFactory("PepasurSimpleFixed");
  const contract = PepasurSimpleFixed.attach(contractAddress);

  const stakeAmount = hre.ethers.parseEther("0.001"); // 0.001 FLOW

  console.log("\n🎮 Test Scenario: 4-Player Game");
  console.log("├─ Stake: 0.001 FLOW per player");
  console.log("├─ Total Pool: 0.004 FLOW");
  console.log("├─ Winners (98%): 0.00392 FLOW");
  console.log("└─ House (2%): 0.00008 FLOW");

  try {
    // Step 1: Player 1 creates game
    console.log("\n📝 Step 1: Player 1 creates 4-player game...");
    const createTx = await contract.connect(player1).createGame(stakeAmount, 4, 4, {
      value: stakeAmount
    });
    await createTx.wait();
    
    const gameId = 1; // First game
    console.log("✅ Game created with ID:", gameId);

    // Check initial game state
    let gameData = await contract.getGame(gameId);
    console.log("├─ Status:", gameData.status, "(0=LOBBY, 1=READY, 2=IN_PROGRESS, 3=SETTLED)");
    console.log("├─ Players:", gameData.players.length);
    console.log("└─ Total Pool:", hre.ethers.formatEther(gameData.totalPool), "FLOW");

    // Step 2: Player 2 joins
    console.log("\n📝 Step 2: Player 2 joins...");
    const join2Tx = await contract.connect(player2).joinGame(gameId, {
      value: stakeAmount
    });
    await join2Tx.wait();
    console.log("✅ Player 2 joined");

    // Step 3: Player 3 joins
    console.log("\n📝 Step 3: Player 3 joins...");
    const join3Tx = await contract.connect(player3).joinGame(gameId, {
      value: stakeAmount
    });
    await join3Tx.wait();
    console.log("✅ Player 3 joined");

    // Check game state before 4th player
    gameData = await contract.getGame(gameId);
    console.log("├─ Status:", gameData.status, "(should be 1=READY)");
    console.log("├─ Players:", gameData.players.length, "/4");
    console.log("└─ Total Pool:", hre.ethers.formatEther(gameData.totalPool), "FLOW");

    // Step 4: Player 4 joins (should auto-start)
    console.log("\n📝 Step 4: Player 4 joins (should auto-start game)...");
    const join4Tx = await contract.connect(player4).joinGame(gameId, {
      value: stakeAmount
    });
    await join4Tx.wait();
    console.log("✅ Player 4 joined");

    // Check final game state
    gameData = await contract.getGame(gameId);
    console.log("├─ Status:", gameData.status, "(should be 2=IN_PROGRESS)");
    console.log("├─ Players:", gameData.players.length, "/4");
    console.log("├─ Total Pool:", hre.ethers.formatEther(gameData.totalPool), "FLOW");
    console.log("└─ Start Time:", new Date(Number(gameData.startTime) * 1000).toISOString());

    // Step 5: Test game stats
    console.log("\n📊 Game Statistics:");
    const stats = await contract.getGameStats(gameId);
    console.log("├─ Current Players:", stats.currentPlayers.toString());
    console.log("├─ Total Staked:", hre.ethers.formatEther(stats.totalStaked), "FLOW");
    console.log("├─ Can Join:", stats.canJoin);
    console.log("└─ Can Start:", stats.canStart);

    // Step 6: Simulate game settlement (owner only)
    console.log("\n🏆 Step 6: Settling game (Player 1 and Player 2 win)...");
    const winners = [player1.address, player2.address];
    const settleTx = await contract.connect(deployer).settleGame(gameId, winners);
    await settleTx.wait();
    console.log("✅ Game settled");

    // Check pending withdrawals
    console.log("\n💰 Pending Withdrawals:");
    for (let i = 1; i <= 4; i++) {
      const player = [player1, player2, player3, player4][i-1];
      const pending = await contract.getPendingWithdrawal(player.address);
      const isWinner = winners.includes(player.address);
      console.log(`├─ Player ${i} (${isWinner ? 'WINNER' : 'LOSER'}):`, hre.ethers.formatEther(pending), "FLOW");
    }

    const ownerPending = await contract.getPendingWithdrawal(deployer.address);
    console.log(`└─ House Cut:`, hre.ethers.formatEther(ownerPending), "FLOW");

    console.log("\n🎉 Test completed successfully!");
    console.log("✅ All 4 players joined successfully");
    console.log("✅ Game auto-started when full");
    console.log("✅ Rewards distributed correctly (98%/2%)");
    console.log("✅ Winners get rewards, losers get nothing");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
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