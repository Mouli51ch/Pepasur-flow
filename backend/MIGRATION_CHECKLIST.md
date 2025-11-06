# Backend Migration Checklist - Flow EVM

Complete step-by-step checklist for migrating backend from Aptos to Flow EVM.

---

## Pre-Migration Checklist

- [x] Contract deployed to Flow EVM Testnet
- [x] Contract address: `0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c`
- [x] Owner wallet private key available
- [x] EvmServiceSimple.js created
- [x] Backend .env configured
- [ ] Ready to update backend code

---

## Migration Steps

### Step 1: Backup Current Files ⏱️ 2 minutes

**Why:** Create backup of working Aptos code before making changes

```bash
cd PepasurAptos/backend

# Backup original files
cp server.js server.aptos.backup.js
cp services/GameManager.js services/GameManager.aptos.backup.js
cp services/StakingService.js services/StakingService.aptos.backup.js

# Verify backups created
ls -la *.backup.js services/*.backup.js
```

**Checklist:**
- [ ] server.js backed up
- [ ] GameManager.js backed up
- [ ] StakingService.js backed up

---

### Step 2: Update server.js ⏱️ 3 minutes

**Option A: Use example file (recommended)**

```bash
cp examples/server.flow-evm.js server.js
```

**Option B: Manual update**

Edit `server.js` and make these changes:

1. Line 14: Change import
   ```javascript
   // OLD: const AptosService = require('./services/AptosService');
   const EvmServiceSimple = require('./services/EvmServiceSimple');
   ```

2. Line 78: Change instantiation
   ```javascript
   // OLD: const aptosService = new AptosService();
   const evmService = new EvmServiceSimple();
   ```

3. Line 76: Pass service to GameManager
   ```javascript
   // OLD: const gameManager = new GameManager();
   const gameManager = new GameManager(evmService);
   ```

4. Line 84: Pass service to routes
   ```javascript
   // OLD: app.use('/api/game', gameRoutes(gameManager, aptosService));
   app.use('/api/game', gameRoutes(gameManager, evmService));
   ```

**Checklist:**
- [ ] EvmServiceSimple imported
- [ ] evmService instantiated
- [ ] GameManager receives evmService
- [ ] Routes receive evmService

---

### Step 3: Update GameManager.js ⏱️ 5 minutes

**Reference:** `examples/GameManager.flow-evm.patch.js`

**Change 1: Constructor (line 7-14)**

```javascript
// OLD:
constructor(socketManager = null) {
  this.socketManager = socketManager;
  this.stakingService = new StakingService();
  // ...
}

// NEW:
constructor(blockchainService = null, socketManager = null) {
  this.socketManager = socketManager;
  this.blockchainService = blockchainService; // ADD THIS
  this.stakingService = new StakingService(blockchainService); // CHANGE THIS
  // ...
}
```

**Change 2: createGame on-chain logic (line 76-89)**

```javascript
// OLD:
const aptosService = new AptosService();
const onChainGameId = await aptosService.createGame(game.stakeAmount, game.minPlayers);

// NEW:
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
```

**Checklist:**
- [ ] Constructor updated to accept blockchainService
- [ ] blockchainService stored as instance variable
- [ ] StakingService receives blockchainService
- [ ] createGame uses this.blockchainService
- [ ] Direct AptosService instantiation removed

---

### Step 4: Update StakingService.js ⏱️ 10 minutes

**Reference:** `examples/StakingService.flow-evm.patch.js`

**Change 1: Remove Aptos imports (line 1-2)**

```javascript
// OLD:
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");
const crypto = require('crypto');

// NEW:
const crypto = require('crypto');
```

**Change 2: Update constructor (line 4-14)**

```javascript
// OLD:
constructor() {
  this.stakedGames = new Map();
  this.playerStakes = new Map();
  this.aptos = null;
  this.account = null;
  this.initialize();
}

// NEW:
constructor(blockchainService = null) {
  this.stakedGames = new Map();
  this.playerStakes = new Map();
  this.blockchainService = blockchainService; // ADD THIS
  // Remove this.aptos, this.account, and initialize() call
}
```

**Change 3: Remove initialize() method (line 16-44)**

DELETE the entire `async initialize()` method.

**Change 4: Rewrite distributeRewards() (line 289-329)**

This is the most important change. See `examples/StakingService.flow-evm.patch.js` for complete code.

Key changes:
- Use `this.blockchainService.submitSettlement()` instead of `aptosService.submitSettlement()`
- Only pass winners (not payout amounts)
- Add explorerLink to return value
- Use `formatFlow()` instead of manual division

**Checklist:**
- [ ] Aptos SDK imports removed
- [ ] Constructor accepts blockchainService
- [ ] initialize() method removed
- [ ] distributeRewards() rewritten for EVM
- [ ] checkBalance() updated (optional)
- [ ] stakeForGame() updated (optional)

---

### Step 5: Verify Environment Configuration ⏱️ 1 minute

```bash
# Check .env file
cat .env | grep -E "(PEPASUR_CONTRACT_ADDRESS|IS_SIMPLE_CONTRACT|SERVER_PRIVATE_KEY|FLOW_EVM_RPC_URL)"
```

**Expected output:**
```
PEPASUR_CONTRACT_ADDRESS=0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c
IS_SIMPLE_CONTRACT=true
SERVER_PRIVATE_KEY=0xaf0e3c0f38439b5347fdf62b609f1cbcfa2b892a9a4d34da14cf2e8729dda421
FLOW_EVM_RPC_URL=https://testnet.evm.nodes.onflow.org
```

**Checklist:**
- [ ] PEPASUR_CONTRACT_ADDRESS is set
- [ ] IS_SIMPLE_CONTRACT=true
- [ ] SERVER_PRIVATE_KEY is set
- [ ] FLOW_EVM_RPC_URL is set

---

### Step 6: Test Server Startup ⏱️ 2 minutes

```bash
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
🔷 Using Flow EVM Testnet
📝 Contract: 0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c
```

**Checklist:**
- [ ] Server starts without errors
- [ ] EVM Service initializes successfully
- [ ] Contract owner matches SERVER_ADDRESS
- [ ] No "module not found" errors

**Common errors:**

❌ **"Cannot find module 'ethers'"**
```bash
npm install ethers@^6.8.1
```

❌ **"Contract artifact not found"**
```bash
# Check path exists
ls ../../contract-flow/artifacts/contracts/PepasurSimple.sol/PepasurSimple.json
```

❌ **"PEPASUR_CONTRACT_ADDRESS not set"**
```bash
# Add to .env
echo "PEPASUR_CONTRACT_ADDRESS=0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c" >> .env
```

---

### Step 7: Test Health Endpoint ⏱️ 1 minute

```bash
curl http://localhost:3001/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "blockchain": "Flow EVM Testnet",
  "contract": "0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c",
  "evmServiceReady": true,
  "timestamp": "2025-10-30T...",
  "clientIP": "::1",
  "origin": null
}
```

**Checklist:**
- [ ] Health endpoint returns 200
- [ ] evmServiceReady is true
- [ ] Contract address correct

---

### Step 8: Test Game Creation (Optional) ⏱️ 3 minutes

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
  "gameId": "abc-123-def-456",
  "roomCode": "ABC123",
  "onChainGameId": 1,
  "message": "Game created successfully"
}
```

**Server logs should show:**
```
🎮 Creating game on-chain with stake: 1000000000000000000 wei
🎮 Creating test game...
├─ Stake: 1.0 FLOW
└─ Min players: 4
✅ Game created! ID: 1
✅ Game created on-chain with ID: 1
```

**Checklist:**
- [ ] Game creation succeeds
- [ ] onChainGameId returned
- [ ] No errors in server logs

---

### Step 9: Verify On-Chain Game (Optional) ⏱️ 2 minutes

Visit FlowScan to verify game was created:

https://evm-testnet.flowscan.io/address/0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c

Or use test script:
```bash
node test-evm-service.js
```

**Checklist:**
- [ ] Contract shows transactions on FlowScan
- [ ] test-evm-service.js runs without errors
- [ ] Game info can be fetched

---

## Post-Migration Verification

### Functionality Checklist

- [ ] ✅ Server starts successfully
- [ ] ✅ EVM Service initializes
- [ ] ✅ Health endpoint works
- [ ] ✅ Can create games
- [ ] ✅ Games created on-chain
- [ ] ⏳ Can join games (frontend required)
- [ ] ⏳ Can settle games
- [ ] ⏳ Winners can withdraw

### Code Quality Checklist

- [ ] No Aptos SDK imports remaining
- [ ] No direct AptosService instantiation
- [ ] All blockchain calls go through this.blockchainService
- [ ] Error handling in place
- [ ] Logging statements added
- [ ] Explorer links generated

---

## Rollback Plan

If migration fails, rollback to Aptos:

```bash
cd PepasurAptos/backend

# Restore backups
cp server.aptos.backup.js server.js
cp services/GameManager.aptos.backup.js services/GameManager.js
cp services/StakingService.aptos.backup.js services/StakingService.js

# Use Aptos .env
cp .env.aptos .env  # If you have this

# Restart server
npm run dev
```

**Checklist:**
- [ ] Backups available
- [ ] Know how to restore
- [ ] Have Aptos .env saved

---

## Success Criteria

Migration is successful when:

1. ✅ Server starts without errors
2. ✅ EVM Service shows as initialized and ready
3. ✅ Health endpoint returns `evmServiceReady: true`
4. ✅ Can create games that appear on-chain
5. ✅ Settlement flow works (when game completes)
6. ✅ No Aptos-related errors in logs

---

## Next Steps After Successful Migration

1. **Phase 2 Complete!** ✅
2. **Test full game flow:**
   - Create game
   - Join from multiple wallets
   - Play game to completion
   - Verify settlement
   - Test withdrawals

3. **Phase 3: Frontend Migration**
   - Replace Aptos wallet adapter with wagmi + RainbowKit
   - Update contract interaction hooks
   - Test with MetaMask

---

## Troubleshooting Common Issues

### Issue: "Blockchain service not available"

**Cause:** EvmServiceSimple not passed to GameManager or StakingService

**Fix:**
```javascript
// server.js
const evmService = new EvmServiceSimple();
const gameManager = new GameManager(evmService); // ✅ Pass here

// GameManager.js constructor
constructor(blockchainService = null, socketManager = null) {
  this.blockchainService = blockchainService; // ✅ Store here
  this.stakingService = new StakingService(blockchainService); // ✅ Pass here
}
```

---

### Issue: "Not owner" on settlement

**Cause:** SERVER_PRIVATE_KEY wallet is not contract owner

**Fix:**
```bash
# Check who's the contract owner
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
const contract = new ethers.Contract(
  '0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c',
  ['function owner() view returns (address)'],
  provider
);
contract.owner().then(owner => {
  console.log('Contract owner:', owner);
  console.log('Your wallet:', process.env.SERVER_ADDRESS);
  console.log('Match:', owner.toLowerCase() === process.env.SERVER_ADDRESS.toLowerCase());
});
"
```

If mismatch, update your private key or transfer ownership.

---

### Issue: Network timeouts

**Cause:** Local network/firewall blocking Node.js HTTP to Flow RPC

**Workarounds:**
1. Try different network (mobile hotspot)
2. Use VPN
3. Test from cloud server
4. Use frontend testing (MetaMask works)

**Note:** This is a local environment issue, not code issue.

---

## Time Estimate

- **Minimum:** 15 minutes (if using example files)
- **Maximum:** 30 minutes (if doing manual updates)
- **Testing:** 10-15 minutes
- **Total:** 25-45 minutes

---

## Help & Support

**Documentation:**
- Backend Migration: `BACKEND_MIGRATION_GUIDE.md`
- Integration Examples: `INTEGRATION_EXAMPLES.md`
- Contract Guide: `../../contract-flow/SIMPLE_CONTRACT_GUIDE.md`

**Example Files:**
- `examples/server.flow-evm.js` - Ready-to-use server.js
- `examples/GameManager.flow-evm.patch.js` - GameManager changes
- `examples/StakingService.flow-evm.patch.js` - StakingService changes

**Testing:**
- `test-evm-simple.js` - Basic connectivity test
- `test-evm-service.js` - Full service test

---

## Migration Completion

When all checkboxes above are checked, Phase 2 is complete! 🎉

**What you've achieved:**
- ✅ Backend migrated from Aptos to Flow EVM
- ✅ Blockchain service abstraction in place
- ✅ Settlement flow updated
- ✅ Ready for frontend migration (Phase 3)

**Ready for Phase 3?**

Phase 3 will migrate the frontend to use:
- wagmi for EVM wallet connections
- RainbowKit for wallet UI
- ethers.js for contract interactions
- MetaMask/WalletConnect for transactions

See `MIGRATION_PLAN.md` for Phase 3 details.
