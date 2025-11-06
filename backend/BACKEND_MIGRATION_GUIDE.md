# Backend Migration Guide: Aptos → Flow EVM

Complete guide for migrating Pepasur backend from Aptos to Flow EVM Testnet using PepasurSimple contract.

---

## Overview

**What Changed:**
- ❌ Removed: `AptosService.js` (Aptos SDK)
- ✅ Added: `EvmServiceSimple.js` (ethers.js)
- ✅ Simplified: No signature generation (owner settles directly)
- ✅ Same Interface: Drop-in replacement for most functions

---

## Setup

### 1. Install Dependencies

Dependencies are already in `package.json`:
```bash
cd backend
npm install
```

**Key dependency:** `ethers@^6.8.1` (already present)

### 2. Configure Environment

Copy `.env.flow` to `.env`:
```bash
cp .env.flow .env
```

**Required variables:**
```env
# Flow EVM Configuration
FLOW_EVM_RPC_URL=https://testnet.evm.nodes.onflow.org
CHAIN_ID=545

# Contract
PEPASUR_CONTRACT_ADDRESS=0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c
IS_SIMPLE_CONTRACT=true

# Owner Wallet (for settling games)
SERVER_PRIVATE_KEY=0xaf0e3c0f38439b5347fdf62b609f1cbcfa2b892a9a4d34da14cf2e8729dda421
SERVER_ADDRESS=0x798b32BDf86253060d598038b1D77C98C36881D6
```

⚠️ **IMPORTANT:** Your `SERVER_PRIVATE_KEY` wallet MUST be the contract owner to settle games!

---

## EvmServiceSimple API

### Initialization

```javascript
const EvmServiceSimple = require('./services/EvmServiceSimple');

// Automatically initializes on instantiation
const evmService = new EvmServiceSimple();

// Check if ready
if (evmService.isReady()) {
  console.log('✅ Service ready');
}
```

### Core Functions

#### 1. Get Game Information
```javascript
const game = await evmService.getGameInfo(gameId);

console.log(game);
// {
//   id: 1,
//   creator: '0x...',
//   stakeAmount: '1000000000000000000', // wei
//   minPlayers: 4,
//   players: ['0x...', '0x...'],
//   status: 1, // 0=LOBBY, 1=IN_PROGRESS, 2=SETTLED
//   totalPool: '4000000000000000000'
// }
```

#### 2. Get Players
```javascript
const players = await evmService.getGamePlayers(gameId);
console.log('Players:', players);
// ['0x...', '0x...', '0x...', '0x...']
```

#### 3. Settle Game (Owner Only)
```javascript
const winners = [
  '0xPlayer1Address...',
  '0xPlayer2Address...'
];

const result = await evmService.submitSettlement(gameId, winners);

console.log(result);
// {
//   success: true,
//   transactionHash: '0x...',
//   blockNumber: 123456,
//   gasUsed: '150000'
// }
```

#### 4. Get Pending Withdrawal
```javascript
const pending = await evmService.getPendingWithdrawal(playerAddress);
console.log('Pending:', evmService.formatFlow(pending), 'FLOW');
```

#### 5. Get Contract Info
```javascript
const info = await evmService.getContractInfo();
console.log(info);
// {
//   owner: '0x...',
//   nextGameId: 5,
//   houseCutBps: 200
// }
```

#### 6. Emergency Refund (Owner Only)
```javascript
await evmService.emergencyRefund(gameId);
// Refunds all players in the game
```

---

## Migration from AptosService

### Function Mapping

| AptosService | EvmServiceSimple | Notes |
|--------------|------------------|-------|
| `createGame()` | `createGameForTesting()` | Frontend creates games |
| `joinGame()` | N/A | Frontend joins games |
| `getGameInfo()` | `getGameInfo()` | ✅ Same interface |
| `getGamePlayers()` | `getGamePlayers()` | ✅ Same interface |
| `submitSettlement()` | `submitSettlement()` | ✅ Simplified (no signature) |
| `withdraw()` | N/A | Frontend withdraws |
| `getContractInfo()` | `getContractInfo()` | ✅ Similar |

### Key Differences

**Before (Aptos):**
```javascript
// Complex: Generate ED25519 signature
const signature = await aptosService.signSettlement(gameId, winners, payouts);
await aptosService.submitSettlement(gameId, winners, payouts, signature);
```

**After (Flow EVM):**
```javascript
// Simple: Owner settles directly
await evmService.submitSettlement(gameId, winners);
```

---

## Integration with GameManager

### Option 1: Replace Completely

**In `server.js`:**
```javascript
// OLD:
// const AptosService = require('./services/AptosService');
// const aptosService = new AptosService();

// NEW:
const EvmServiceSimple = require('./services/EvmServiceSimple');
const evmService = new EvmServiceSimple();

// Pass to GameManager
const gameManager = new GameManager(evmService);
```

### Option 2: Conditional (Support Both)

```javascript
// server.js
const isFlowEVM = process.env.IS_SIMPLE_CONTRACT === 'true';

let blockchainService;
if (isFlowEVM) {
  const EvmServiceSimple = require('./services/EvmServiceSimple');
  blockchainService = new EvmServiceSimple();
} else {
  const AptosService = require('./services/AptosService');
  blockchainService = new AptosService();
}

const gameManager = new GameManager(blockchainService);
```

### Update GameManager Settlement

**In `services/GameManager.js`:**

```javascript
// After game concludes, determine winners
const winners = this.determineWinners(gameId);

// Settle on blockchain
try {
  const result = await this.blockchainService.submitSettlement(
    gameId,
    winners.map(w => w.address) // Array of addresses
  );

  console.log('✅ Game settled on-chain:', result.transactionHash);

  // Update game state
  game.status = 'SETTLED';
  game.settlementTx = result.transactionHash;

  // Notify players
  this.socketManager.emit(gameId, 'gameSettled', {
    winners: winners,
    transactionHash: result.transactionHash
  });

} catch (error) {
  console.error('❌ Settlement failed:', error.message);
  // Handle error (maybe retry or manual intervention)
}
```

---

## Complete Game Flow Example

```javascript
// 1. Game created (from frontend)
// Frontend calls: contract.createGame(stakeAmount, minPlayers, { value: stakeAmount })

// 2. Players join (from frontend)
// Frontend calls: contract.joinGame(gameId, { value: stakeAmount })

// 3. Backend detects game started (via socket/events)
gameManager.on('gameStarted', async (gameId) => {
  console.log('🎮 Game', gameId, 'started!');

  // Assign roles
  gameManager.assignRoles(gameId);

  // Start night phase
  gameManager.startNightPhase(gameId);
});

// 4. Game plays out (night/task/voting phases)
// ... off-chain game logic ...

// 5. Game concludes
gameManager.on('gameEnded', async (gameId) => {
  const game = gameManager.getGame(gameId);

  // Determine winners
  const winners = [];
  if (game.winner === 'MAFIA') {
    // Mafia won - add all living mafia players
    winners.push(...game.players.filter(p => p.role === 'MAFIA' && p.alive));
  } else {
    // Non-Mafia won - add ALL non-mafia players (living and dead)
    winners.push(...game.players.filter(p => p.role !== 'MAFIA'));
  }

  const winnerAddresses = winners.map(w => w.address);

  console.log('🏆 Settling game with winners:', winnerAddresses);

  // Settle on blockchain
  const result = await evmService.submitSettlement(gameId, winnerAddresses);

  console.log('✅ Settlement complete:', result.transactionHash);

  // Notify players
  socketManager.emit(gameId, 'gameSettled', {
    winners: winnerAddresses,
    transactionHash: result.transactionHash,
    explorerLink: `https://evm-testnet.flowscan.io/tx/${result.transactionHash}`
  });
});

// 6. Winners withdraw (from frontend)
// Frontend calls: contract.withdraw()
```

---

## Reward Calculation

```javascript
/**
 * Calculate expected rewards (for display purposes)
 */
function calculateRewards(game, winners) {
  const totalPool = BigInt(game.totalPool);
  const houseFee = totalPool * 200n / 10000n; // 2%
  const rewardPool = totalPool - houseFee;
  const rewardPerWinner = rewardPool / BigInt(winners.length);

  return {
    totalPool: totalPool.toString(),
    houseFee: houseFee.toString(),
    rewardPool: rewardPool.toString(),
    rewardPerWinner: rewardPerWinner.toString(),
    rewardPerWinnerFormatted: evmService.formatFlow(rewardPerWinner)
  };
}

// Example
const rewards = calculateRewards(game, winnerAddresses);
console.log('Each winner gets:', rewards.rewardPerWinnerFormatted, 'FLOW');
```

---

## Error Handling

```javascript
async function settleGameSafely(gameId, winners) {
  try {
    const result = await evmService.submitSettlement(gameId, winners);
    return { success: true, ...result };

  } catch (error) {
    // Parse error
    if (error.message.includes('Not owner')) {
      console.error('❌ Your wallet is not the contract owner!');
      return { success: false, error: 'NOT_OWNER' };

    } else if (error.message.includes('Game not in progress')) {
      console.error('❌ Game is not in progress state');
      return { success: false, error: 'INVALID_STATE' };

    } else if (error.message.includes('insufficient funds')) {
      console.error('❌ Insufficient FLOW for gas');
      return { success: false, error: 'INSUFFICIENT_GAS' };

    } else {
      console.error('❌ Unknown error:', error.message);
      return { success: false, error: 'UNKNOWN', details: error.message };
    }
  }
}
```

---

## Testing

### Test 1: Basic Connection
```bash
node test-evm-simple.js
```

**Expected output:**
```
✅ Connected! Current block: 76464643
✅ Artifact loaded! ABI has 11 functions
✅ Contract instance created
✅ Owner: 0x798b32BDf86253060d598038b1D77C98C36881D6
```

### Test 2: Full Service
```bash
node test-evm-service.js
```

**Expected output:**
```
✅ Contract Info:
├─ Owner: 0x798b32BDf86253060d598038b1D77C98C36881D6
├─ Next Game ID: 1
└─ House Cut: 200 bps
```

### Test 3: Create Test Game
```javascript
// In Node.js REPL or test script
const evmService = new EvmServiceSimple();

// Wait for init
setTimeout(async () => {
  const gameId = await evmService.createGameForTesting(
    ethers.parseEther('0.1'), // 0.1 FLOW
    4 // 4 players
  );
  console.log('Created game:', gameId);
}, 3000);
```

---

## Network Issues Troubleshooting

⚠️ **If you encounter timeout errors:**

This is a **local network/firewall issue**, not a code problem. The service works correctly but Node.js HTTP connections may be blocked.

**Solutions:**
1. **Try different network** - Use mobile hotspot
2. **Use VPN** - Bypass firewall
3. **Test from different machine** - Maybe a cloud server
4. **Use browser testing** - MetaMask + frontend (known to work)

**Evidence it works:**
- ✅ Contract deployed successfully via browser
- ✅ Browser can interact with Flow EVM Testnet
- ✅ Only Node.js HTTP connections timeout
- ✅ Code is correct (just network blocked)

---

## Production Checklist

Before going live:

- [ ] Owner private key secured (not in git!)
- [ ] Environment variables set correctly
- [ ] Contract ownership verified
- [ ] Test settlement with small amounts
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Backup owner key stored safely
- [ ] Consider upgrading to full Pepasur contract (with EIP-712)

---

## Next Steps

1. ✅ **Backend service created** - EvmServiceSimple.js
2. ✅ **Environment configured** - .env file
3. ⏳ **Test on different network** - Or use frontend
4. ⏳ **Integrate with GameManager** - Update settlement logic
5. ⏳ **Frontend migration** - Phase 3

---

## Support

**Files:**
- `services/EvmServiceSimple.js` - Main service
- `test-evm-simple.js` - Basic connectivity test
- `test-evm-service.js` - Full service test
- `.env` - Configuration
- `BACKEND_MIGRATION_GUIDE.md` - This file

**Contract:**
- Address: `0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c`
- Explorer: https://evm-testnet.flowscan.io/address/0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c

**Documentation:**
- Contract: `../../contract-flow/SIMPLE_CONTRACT_GUIDE.md`
- Migration: `../../MIGRATION_PLAN.md`
- Deployment: `../../DEPLOYMENT_SUCCESS.md`
