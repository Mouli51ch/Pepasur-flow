/**
 * GameManager.flow-evm.patch.js
 *
 * Patch showing the specific changes needed in GameManager.js for Flow EVM
 *
 * Apply these changes to your existing GameManager.js file.
 */

// ============================================
// CHANGE 1: Constructor - Accept blockchain service
// ============================================

// BEFORE (line 7-14):
/*
class GameManager {
  constructor(socketManager = null) {
    this.games = new Map();
    this.detectiveReveals = new Map();
    this.roomCodes = new Map();
    this.socketManager = socketManager;
    this.stakingService = new StakingService();
    // ...
  }
}
*/

// AFTER:
class GameManager {
  constructor(blockchainService = null, socketManager = null) {
    this.games = new Map();
    this.detectiveReveals = new Map();
    this.roomCodes = new Map();
    this.socketManager = socketManager;
    this.blockchainService = blockchainService; // ✅ ADDED
    this.stakingService = new StakingService(blockchainService); // ✅ CHANGED - pass blockchain service
    this.gameStartTimes = new Map();
    this.phaseStartTimes = new Map();
    this.MAX_GAME_DURATION = 30 * 60 * 1000; // 30 minutes
    this.MAX_PHASE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Start monitoring service
    this.startMonitoringService();
  }
  // ... rest of constructor
}

// ============================================
// CHANGE 2: createGame - Remove direct AptosService instantiation
// ============================================

// BEFORE (line 76-89):
/*
if (contractGameId) {
  game.onChainGameId = contractGameId;
  console.log(`🎮 Using provided contract gameId: ${contractGameId}`);
} else if (game.stakingRequired) {
  try {
    console.log(`🎮 Creating game on-chain with stake: ${game.stakeAmount} APT`);

    const aptosService = new AptosService(); // ❌ REMOVE
    const onChainGameId = await aptosService.createGame(game.stakeAmount, game.minPlayers); // ❌ REMOVE

    console.log(`✅ Game created on-chain with ID: ${onChainGameId}`);
    game.onChainGameId = onChainGameId;

  } catch (error) {
    console.error('❌ Error creating game on-chain:', error);
  }
}
*/

// AFTER:
if (contractGameId) {
  game.onChainGameId = contractGameId;
  console.log(`🎮 Using provided contract gameId: ${contractGameId}`);
} else if (game.stakingRequired) {
  try {
    console.log(`🎮 Creating game on-chain with stake: ${game.stakeAmount} wei`);

    // ✅ Use injected blockchain service
    if (this.blockchainService && this.blockchainService.isReady()) {
      // Convert stake amount to BigInt for EVM
      const stakeAmountBigInt = BigInt(game.stakeAmount);

      const onChainGameId = await this.blockchainService.createGameForTesting(
        stakeAmountBigInt,
        game.minPlayers
      );

      console.log(`✅ Game created on-chain with ID: ${onChainGameId}`);
      game.onChainGameId = onChainGameId;
    } else {
      throw new Error('Blockchain service not ready');
    }

  } catch (error) {
    console.error('❌ Error creating game on-chain:', error);
    throw error; // ✅ Re-throw so creator knows creation failed
  }
}

// ============================================
// CHANGE 3: endGame - Already uses stakingService
// ============================================

// NO CHANGES NEEDED in endGame function (line 1391-1480)
// The function already calls this.stakingService.distributeRewards()
// We're updating StakingService to use the blockchain service

// However, you can ADD better logging and frontend notification:

// AFTER reward distribution (around line 1458), ADD:
/*
if (distributionResult.success) {
  console.log(`✅ Settlement successful!`);
  console.log(`├─ Transaction: ${distributionResult.settlementTxHash}`);
  console.log(`├─ Block: ${distributionResult.blockNumber}`);
  console.log(`└─ Explorer: ${distributionResult.explorerLink}`);

  // Store settlement transaction info
  game.settlementTx = distributionResult.settlementTxHash;
  game.settlementBlock = distributionResult.blockNumber;
  game.explorerLink = distributionResult.explorerLink;

  // Notify players via Socket.IO with transaction details
  if (this.socketManager) {
    this.socketManager.io.to(`game-${gameId}`).emit('game_settled', {
      gameId: contractGameId,
      winners: winners,
      distributions: distributionResult.distributions,
      transactionHash: distributionResult.settlementTxHash,
      blockNumber: distributionResult.blockNumber,
      explorerLink: distributionResult.explorerLink,
      message: 'Game settled on-chain! Winners can now withdraw their rewards.',
      timestamp: Date.now()
    });
  }
} else {
  throw new Error('Settlement failed: ' + (distributionResult.error || 'Unknown error'));
}
*/

// ============================================
// SUMMARY OF CHANGES
// ============================================

/*
File: GameManager.js

Changes needed:
1. Line 7-14: Update constructor to accept blockchainService parameter
2. Line 13: Pass blockchainService to StakingService constructor
3. Line 76-89: Replace direct AptosService instantiation with this.blockchainService
4. Line 1458: (Optional) Add better settlement logging and notifications

Total changes: 3 required, 1 optional
Estimated time: 5 minutes
*/

// ============================================
// TESTING CHANGES
// ============================================

/*
After making these changes:

1. Ensure server.js passes blockchain service:
   const gameManager = new GameManager(evmService); // First param is blockchain service
   gameManager.socketManager = socketManager; // Second param set separately

2. Start server and check logs:
   npm run dev

   Expected output:
   🔷 Initializing EVM Service for Flow Testnet...
   ✅ Contract loaded successfully
   ✅ EVM Service initialized successfully
   🚀 ASUR Backend server running on 0.0.0.0:3001

3. Create a test game:
   POST /api/game/create
   {
     "creatorAddress": "0x798b32BDf86253060d598038b1D77C98C36881D6",
     "stakeAmount": "1000000000000000000",
     "minPlayers": 4
   }

   Expected response:
   {
     "success": true,
     "gameId": "abc-123-def",
     "onChainGameId": 1
   }

4. Verify game was created on-chain:
   Check FlowScan: https://evm-testnet.flowscan.io/address/0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c
*/

module.exports = GameManager;
