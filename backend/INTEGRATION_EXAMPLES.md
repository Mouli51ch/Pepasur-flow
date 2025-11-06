# Backend Integration Examples - Flow EVM

Complete guide showing exactly how to integrate EvmServiceSimple into your existing backend code.

---

## Overview

This guide shows the **specific code changes** needed to integrate Flow EVM blockchain service into your existing Pepasur backend. You can either:

- **Option A:** Replace Aptos completely (recommended for migration)
- **Option B:** Support both chains conditionally (for gradual migration)

---

## Option A: Complete Replacement (Recommended)

### 1. Update `server.js`

**File:** `PepasurAptos/backend/server.js`

**Current code (lines 14, 78, 84):**
```javascript
const AptosService = require('./services/AptosService');
// ...
const aptosService = new AptosService();
// ...
app.use('/api/game', gameRoutes(gameManager, aptosService));
```

**Updated code:**
```javascript
const EvmServiceSimple = require('./services/EvmServiceSimple');
// ...
const evmService = new EvmServiceSimple();
// ...
app.use('/api/game', gameRoutes(gameManager, evmService));
```

**Complete updated server.js section:**
```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const gameRoutes = require('./routes/game');
const detectiveRoutes = require('./routes/detective');
const stakingRoutes = require('./routes/staking');

const GameManager = require('./services/GameManager');
const SocketManager = require('./services/SocketManager');
const EvmServiceSimple = require('./services/EvmServiceSimple'); // ✅ CHANGED

const app = express();
const server = http.createServer(app);

// ... (CORS and Socket.IO config remains the same) ...

// Initialize services
const evmService = new EvmServiceSimple(); // ✅ CHANGED
const gameManager = new GameManager(evmService); // ✅ CHANGED - pass blockchain service
const socketManager = new SocketManager(io, gameManager);

// Set the socketManager reference in gameManager
gameManager.socketManager = socketManager;

// Routes
app.use('/api/game', gameRoutes(gameManager, evmService)); // ✅ CHANGED
app.use('/api/detective', detectiveRoutes(gameManager));
app.use('/api/staking', stakingRoutes);

// ... (rest of server.js remains the same) ...
```

---

### 2. Update `GameManager.js`

**File:** `PepasurAptos/backend/services/GameManager.js`

**Change 1: Constructor - Accept blockchain service**

**Current code (lines 7-14):**
```javascript
class GameManager {
  constructor(socketManager = null) {
    this.games = new Map();
    this.detectiveReveals = new Map();
    this.roomCodes = new Map();
    this.socketManager = socketManager;
    this.stakingService = new StakingService();
    // ...
  }
```

**Updated code:**
```javascript
class GameManager {
  constructor(blockchainService = null, socketManager = null) {
    this.games = new Map();
    this.detectiveReveals = new Map();
    this.roomCodes = new Map();
    this.socketManager = socketManager;
    this.blockchainService = blockchainService; // ✅ ADDED
    this.stakingService = new StakingService(blockchainService); // ✅ CHANGED - pass service
    // ...
  }
```

**Change 2: createGame - Remove direct AptosService instantiation**

**Current code (lines 80-81):**
```javascript
const aptosService = new AptosService();
const onChainGameId = await aptosService.createGame(game.stakeAmount, game.minPlayers);
```

**Updated code:**
```javascript
if (this.blockchainService && this.blockchainService.isReady()) {
  const onChainGameId = await this.blockchainService.createGameForTesting(
    BigInt(game.stakeAmount),
    game.minPlayers
  );
  console.log(`✅ Game created on-chain with ID: ${onChainGameId}`);
  game.onChainGameId = onChainGameId;
} else {
  console.warn('⚠️ Blockchain service not ready, game will be off-chain only');
}
```

**Complete updated createGame section (lines 76-89):**
```javascript
if (contractGameId) {
  game.onChainGameId = contractGameId;
  console.log(`🎮 Using provided contract gameId: ${contractGameId}`);
} else if (game.stakingRequired) {
  try {
    console.log(`🎮 Creating game on-chain with stake: ${game.stakeAmount} wei`);

    if (this.blockchainService && this.blockchainService.isReady()) {
      const onChainGameId = await this.blockchainService.createGameForTesting(
        BigInt(game.stakeAmount),
        game.minPlayers
      );
      console.log(`✅ Game created on-chain with ID: ${onChainGameId}`);
      game.onChainGameId = onChainGameId;
    } else {
      throw new Error('Blockchain service not ready');
    }

  } catch (error) {
    console.error('❌ Error creating game on-chain:', error);
    throw error; // Re-throw so creator knows creation failed
  }
}
```

**Change 3: endGame - Update settlement flow**

The `endGame` function (lines 1391-1480) calls `this.stakingService.distributeRewards()` which handles settlement internally. No changes needed here - we'll update StakingService instead.

---

### 3. Update `StakingService.js`

**File:** `PepasurAptos/backend/services/StakingService.js`

**Change 1: Constructor - Accept blockchain service**

**Current code (lines 5-14):**
```javascript
class StakingService {
  constructor() {
    this.stakeAmount = 100000;
    this.minPlayers = 4;
    this.totalPool = 400000;
    this.stakedGames = new Map();
    this.playerStakes = new Map();
    this.aptos = null;
    this.account = null;
    this.initialize();
  }
```

**Updated code:**
```javascript
class StakingService {
  constructor(blockchainService = null) {
    this.stakeAmount = 100000; // Keep for backward compatibility
    this.minPlayers = 4;
    this.totalPool = 400000;
    this.stakedGames = new Map();
    this.playerStakes = new Map();
    this.blockchainService = blockchainService; // ✅ ADDED
    // No need for initialize() anymore - using passed service
  }
```

**Change 2: Remove initialize() method**

**Delete lines 16-44** (the entire initialize method) since we're using the passed blockchain service.

**Change 3: Update distributeRewards**

**Current code (lines 289-329):**
```javascript
async distributeRewards(gameId, rewards) {
  try {
    const aptosService = new (require('./AptosService'))();
    const winners = rewards.rewards.map((r) => r.playerAddress);
    const payoutAmounts = rewards.rewards.map((r) => BigInt(r.totalReceived));

    const txHash = await aptosService.submitSettlement(gameId, winners, payoutAmounts);
    // ...
  }
}
```

**Updated code:**
```javascript
async distributeRewards(gameId, rewards) {
  try {
    if (!this.blockchainService || !this.blockchainService.isReady()) {
      throw new Error('Blockchain service not available');
    }

    // Extract winners (players with non-zero rewards)
    const winners = rewards.rewards
      .filter((r) => BigInt(r.totalReceived) > 0n)
      .map((r) => r.playerAddress);

    console.log(`💰 Settling game ${gameId} with ${winners.length} winners`);
    console.log(`💰 Winners:`, winners);

    // Call blockchain settlement (EvmServiceSimple.submitSettlement)
    const result = await this.blockchainService.submitSettlement(gameId, winners);

    if (!result.success) {
      throw new Error('Settlement transaction failed');
    }

    console.log(`✅ Settlement successful! TX: ${result.transactionHash}`);

    // Update game status
    const game = this.stakedGames.get(gameId);
    if (game) {
      game.status = 'completed';
      game.completedAt = Date.now();
    }

    // Format distributions for frontend
    const distributions = rewards.rewards.map((r) => ({
      playerAddress: r.playerAddress,
      role: r.role,
      stakeAmount: r.stakeAmount,
      rewardAmount: r.rewardAmount,
      totalReceived: r.totalReceived,
      // Convert wei to FLOW for display
      stakeAmountInFLOW: this.blockchainService.formatFlow(r.stakeAmount),
      rewardInFLOW: this.blockchainService.formatFlow(r.rewardAmount),
      totalReceivedInFLOW: this.blockchainService.formatFlow(r.totalReceived),
    }));

    return {
      success: true,
      gameId: gameId,
      settlementTxHash: result.transactionHash,
      blockNumber: result.blockNumber,
      explorerLink: `https://evm-testnet.flowscan.io/tx/${result.transactionHash}`,
      distributions: distributions,
      totalPool: rewards.totalPool,
      houseCut: rewards.houseCut,
      rewardPool: rewards.rewardPool,
    };
  } catch (error) {
    console.error('❌ Error distributing rewards:', error);
    throw error;
  }
}
```

**Change 4: Update stakeForGame**

**Current code (lines 129-130):**
```javascript
const aptosService = new (require('./AptosService'))();
const txHash = await aptosService.joinGame(gameId, playerAddress);
```

**Updated code:**
```javascript
// Note: In Flow EVM, players join games from frontend (MetaMask)
// Backend no longer handles individual joins
// This method becomes primarily tracking/validation
console.log(`💰 Player ${playerAddress} joining game ${gameId} on-chain`);
console.log(`⚠️ Join transaction must be initiated from frontend`);

// Just track the player locally
const txHash = 'pending-frontend-join'; // Placeholder
```

**OR** if you want to verify on-chain:
```javascript
if (this.blockchainService && this.blockchainService.isReady()) {
  // Verify player actually joined on-chain
  const game = await this.blockchainService.getGameInfo(gameId);
  if (!game.players.includes(playerAddress)) {
    throw new Error('Player has not joined game on-chain yet');
  }
  console.log(`✅ Verified ${playerAddress} joined game ${gameId} on-chain`);
}
```

---

## Option B: Support Both Chains (Conditional)

If you want to support both Aptos and Flow EVM conditionally during migration:

### 1. Update `server.js` with conditional logic

```javascript
const AptosService = require('./services/AptosService');
const EvmServiceSimple = require('./services/EvmServiceSimple');

// Determine which blockchain to use
const useFlowEVM = process.env.IS_SIMPLE_CONTRACT === 'true';

let blockchainService;
if (useFlowEVM) {
  console.log('🔷 Using Flow EVM blockchain');
  blockchainService = new EvmServiceSimple();
} else {
  console.log('⬢ Using Aptos blockchain');
  blockchainService = new AptosService();
}

const gameManager = new GameManager(blockchainService);
const socketManager = new SocketManager(io, gameManager);
gameManager.socketManager = socketManager;

app.use('/api/game', gameRoutes(gameManager, blockchainService));
```

### 2. Update `GameManager.js` - Same as Option A

### 3. Update `StakingService.js` - Same as Option A

---

## Complete Example: Settlement Flow

Here's the complete flow when a game ends:

```javascript
// 1. Game ends (in GameManager.endGame - line 1391)
async endGame(gameId) {
  const game = this.games.get(gameId);

  // Clear timers, update status
  game.phase = 'ended';
  game.status = 'completed';

  // 2. Handle reward distribution if staking required
  if (game.stakingRequired) {
    try {
      console.log(`💰 Processing rewards for staked game ${gameId}`);

      // Determine winners
      const winners = game.winners || [];
      const losers = game.players.filter(player => !winners.includes(player));

      // Calculate rewards (using StakingService)
      const rewards = this.stakingService.calculateRewards(
        game.onChainGameId, // Use on-chain game ID
        winners,
        losers,
        game.roles,
        game.eliminated || []
      );

      console.log(`💰 Rewards calculated:`, rewards);

      // 3. Distribute rewards on blockchain
      const distributionResult = await this.stakingService.distributeRewards(
        game.onChainGameId, // Use on-chain game ID
        rewards
      );

      console.log(`💰 Rewards distributed:`, distributionResult);

      // Store settlement info
      game.rewards = distributionResult;
      game.settlementTx = distributionResult.settlementTxHash;
      game.explorerLink = distributionResult.explorerLink;

      // 4. Notify players via Socket.IO
      if (this.socketManager) {
        this.socketManager.io.to(`game-${gameId}`).emit('game_settled', {
          gameId: game.onChainGameId,
          winners: winners,
          distributions: distributionResult.distributions,
          transactionHash: distributionResult.settlementTxHash,
          explorerLink: distributionResult.explorerLink,
          message: `Game settled! Winners can withdraw their rewards.`
        });
      }

    } catch (error) {
      console.error('❌ Error distributing rewards:', error);

      // Notify players of settlement failure
      if (this.socketManager) {
        this.socketManager.io.to(`game-${gameId}`).emit('settlement_failed', {
          gameId: game.onChainGameId,
          error: error.message,
          message: 'Settlement failed - please contact support'
        });
      }
    }
  }

  // Emit final game state update
  if (this.socketManager) {
    this.socketManager.emitGameStateUpdate(gameId);
  }

  return game;
}
```

---

## Testing the Integration

### 1. Start backend with Flow EVM configuration

```bash
cd PepasurAptos/backend

# Ensure .env is configured
cat .env | grep PEPASUR_CONTRACT_ADDRESS
# Should show: PEPASUR_CONTRACT_ADDRESS=0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c

# Start server
npm run dev
```

**Expected output:**
```
🔷 Initializing EVM Service for Flow Testnet...
🔑 Owner wallet initialized: 0x798b32BDf86253060d598038b1D77C98C36881D6
✅ Contract loaded successfully
├─ Address: 0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c
├─ Owner: 0x798b32BDf86253060d598038b1D77C98C36881D6
└─ Next Game ID: 1
✅ EVM Service initialized successfully

🚀 ASUR Backend server running on 0.0.0.0:3001
📡 Socket.IO server ready for connections
```

### 2. Create a test game (via API)

```bash
curl -X POST http://localhost:3001/api/game/create \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0x798b32BDf86253060d598038b1D77C98C36881D6",
    "stakeAmount": "1000000000000000000",
    "minPlayers": 4
  }'
```

**Expected response:**
```json
{
  "success": true,
  "gameId": "abc-123-def",
  "roomCode": "ABC123",
  "onChainGameId": 1,
  "message": "Game created successfully"
}
```

### 3. Simulate game completion and settlement

```javascript
// In Node.js REPL or test script
const GameManager = require('./services/GameManager');
const EvmServiceSimple = require('./services/EvmServiceSimple');

const evmService = new EvmServiceSimple();
const gameManager = new GameManager(evmService);

// Wait for service initialization
setTimeout(async () => {
  // Simulate a completed game
  const testGameId = 'test-game-123';
  const game = {
    gameId: testGameId,
    onChainGameId: 1, // Use actual on-chain game ID
    players: [
      '0xPlayer1...',
      '0xPlayer2...',
      '0xPlayer3...',
      '0xPlayer4...'
    ],
    roles: {
      '0xPlayer1...': 'Villager',
      '0xPlayer2...': 'Villager',
      '0xPlayer3...': 'Villager',
      '0xPlayer4...': 'Mafia'
    },
    winners: ['0xPlayer1...', '0xPlayer2...', '0xPlayer3...'], // Non-Mafia won
    eliminated: ['0xPlayer4...'],
    stakingRequired: true,
    stakeAmount: '1000000000000000000', // 1 FLOW
    phase: 'ended'
  };

  gameManager.games.set(testGameId, game);

  // End game (triggers settlement)
  await gameManager.endGame(testGameId);

  console.log('✅ Game ended and settled!');
  console.log('Settlement TX:', game.settlementTx);
  console.log('Explorer:', game.explorerLink);
}, 5000);
```

---

## Summary of Changes

### Files Modified:
1. ✅ **server.js** - Replace AptosService with EvmServiceSimple
2. ✅ **GameManager.js** - Accept blockchain service in constructor
3. ✅ **StakingService.js** - Accept blockchain service, update distributeRewards

### Key Differences:
| Aptos | Flow EVM |
|-------|----------|
| `aptosService.submitSettlement(gameId, winners, payouts)` | `evmService.submitSettlement(gameId, winners)` |
| Winners + payout amounts | Winners only (contract calculates) |
| ED25519 signature verification | Owner-based (no signature) |
| APT denominated in octas | FLOW denominated in wei |

### Benefits:
- ✅ Simpler settlement (no signature generation)
- ✅ Fewer parameters (contract calculates payouts)
- ✅ Same settlement flow (minimal code changes)
- ✅ Easy to test (no complex cryptography)

---

## Troubleshooting

### "Blockchain service not ready"
**Cause:** EvmServiceSimple initialization still in progress
**Fix:** Ensure initialization completes before creating games (3-5 seconds)

### "Not owner" error on settlement
**Cause:** `SERVER_PRIVATE_KEY` wallet is not the contract owner
**Fix:** Verify wallet address matches contract owner:
```bash
# Check contract owner
curl https://testnet.evm.nodes.onflow.org \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{"to":"0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c","data":"0x8da5cb5b"}, "latest"],
    "id": 1
  }'

# Should return: 0x798b32BDf86253060d598038b1D77C98C36881D6 (your owner address)
```

### "Game not in progress" error
**Cause:** Game already settled or not started
**Fix:** Check game status on-chain:
```javascript
const game = await evmService.getGameInfo(gameId);
console.log('Game status:', ['LOBBY', 'IN_PROGRESS', 'SETTLED'][game.status]);
```

---

## Next Steps

After integrating backend:
1. ✅ Test complete game flow (create → join → play → settle)
2. ✅ Verify settlement transactions on FlowScan
3. ✅ Test winner withdrawals (from frontend)
4. ⏳ **Phase 3:** Migrate frontend to wagmi + RainbowKit

---

## Support

**Documentation:**
- Backend Migration: `BACKEND_MIGRATION_GUIDE.md`
- Contract Guide: `../../contract-flow/SIMPLE_CONTRACT_GUIDE.md`
- Deployment Info: `../../DEPLOYMENT_SUCCESS.md`

**Contract:**
- Address: `0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c`
- Explorer: https://evm-testnet.flowscan.io/address/0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c
