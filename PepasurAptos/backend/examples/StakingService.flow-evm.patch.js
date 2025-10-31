/**
 * StakingService.flow-evm.patch.js
 *
 * Patch showing the specific changes needed in StakingService.js for Flow EVM
 *
 * Apply these changes to your existing StakingService.js file.
 */

// ============================================
// CHANGE 1: Remove Aptos imports (line 1-2)
// ============================================

// BEFORE:
/*
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");
const crypto = require('crypto');
*/

// AFTER:
// ✅ No Aptos imports needed anymore
const crypto = require('crypto');

// ============================================
// CHANGE 2: Constructor - Accept blockchain service (line 4-14)
// ============================================

// BEFORE:
/*
class StakingService {
  constructor() {
    this.stakeAmount = 100000; // 0.001 APT
    this.minPlayers = 4;
    this.totalPool = 400000; // 0.004 APT (4 players x 0.001 APT)
    this.stakedGames = new Map();
    this.playerStakes = new Map();
    this.aptos = null;
    this.account = null;
    this.initialize();
  }
*/

// AFTER:
class StakingService {
  constructor(blockchainService = null) {
    this.stakeAmount = 100000; // Keep for backward compatibility
    this.minPlayers = 4;
    this.totalPool = 400000;
    this.stakedGames = new Map();
    this.playerStakes = new Map();
    this.blockchainService = blockchainService; // ✅ ADDED - Use injected blockchain service
    // ✅ No more this.aptos or this.account
    // ✅ No more initialize() call
  }

  // ============================================
  // CHANGE 3: Remove initialize() method (line 16-44)
  // ============================================

  // BEFORE:
  /*
  async initialize() {
    try {
      const network = process.env.NETWORK === 'mainnet' ? Network.MAINNET :
                      process.env.NETWORK === 'testnet' ? Network.TESTNET :
                      Network.DEVNET;

      const config = new AptosConfig({
        network,
        fullnode: process.env.APTOS_NODE_URL
      });
      this.aptos = new Aptos(config);

      if (process.env.SERVER_PRIVATE_KEY) {
        const privateKeyHex = process.env.SERVER_PRIVATE_KEY.replace('ed25519-priv-0x', '').replace('0x', '');
        const privateKey = new Ed25519PrivateKey(privateKeyHex);
        this.account = Account.fromPrivateKey({ privateKey });
        console.log('🔑 Staking account initialized:', this.account.accountAddress.toString());
      }

      console.log('💰 Staking service initialized successfully on', network);
      console.log(`💰 Stake amount: ${this.stakeAmount / 100000000} APT per player`);
      console.log(`💰 Total pool: ${this.totalPool / 100000000} APT for 4 players`);
    } catch (error) {
      console.error('❌ Error initializing staking service:', error);
    }
  }
  */

  // AFTER:
  // ✅ REMOVED - No longer needed, using injected blockchainService

  // ============================================
  // CHANGE 4: Update distributeRewards (line 289-329)
  // ============================================

  // BEFORE:
  /*
  async distributeRewards(gameId, rewards) {
    try {
      const aptosService = new (require('./AptosService'))();
      const winners = rewards.rewards.map((r) => r.playerAddress);
      const payoutAmounts = rewards.rewards.map((r) => BigInt(r.totalReceived));

      const txHash = await aptosService.submitSettlement(gameId, winners, payoutAmounts);

      const game = this.stakedGames.get(gameId);
      if (game) {
        game.status = 'completed';
        game.completedAt = Date.now();
      }

      const distributions = rewards.rewards.map((r) => ({
        playerAddress: r.playerAddress,
        role: r.role,
        stakeAmount: r.stakeAmount,
        rewardAmount: r.rewardAmount,
        totalReceived: r.totalReceived,
        stakeAmountInAPT: (parseInt(r.stakeAmount) / 100000000).toFixed(4),
        rewardInAPT: (parseInt(r.rewardAmount) / 100000000).toFixed(4),
        totalReceivedInAPT: (parseInt(r.totalReceived) / 100000000).toFixed(4),
      }));

      return {
        success: true,
        gameId: gameId,
        settlementTxHash: txHash,
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
  */

  // AFTER:
  async distributeRewards(gameId, rewards) {
    try {
      console.log(`💰 distributeRewards called for game ${gameId}`);

      // ✅ Check blockchain service availability
      if (!this.blockchainService || !this.blockchainService.isReady()) {
        throw new Error('Blockchain service not available or not ready');
      }

      // ✅ Extract only winners (players with non-zero rewards)
      const winners = rewards.rewards
        .filter((r) => BigInt(r.totalReceived) > 0n)
        .map((r) => r.playerAddress);

      if (winners.length === 0) {
        throw new Error('No winners to distribute rewards to');
      }

      console.log(`💰 Settling game ${gameId} with ${winners.length} winners`);
      console.log(`💰 Winners:`, winners);
      console.log(`💰 Total pool: ${rewards.totalPool} wei`);
      console.log(`💰 Reward pool (after house cut): ${rewards.rewardPool} wei`);

      // ✅ Call blockchain settlement (EvmServiceSimple.submitSettlement)
      // Note: PepasurSimple contract automatically calculates payouts
      const result = await this.blockchainService.submitSettlement(gameId, winners);

      if (!result.success) {
        throw new Error('Settlement transaction failed on blockchain');
      }

      console.log(`✅ Settlement successful!`);
      console.log(`├─ Transaction: ${result.transactionHash}`);
      console.log(`├─ Block: ${result.blockNumber}`);
      console.log(`└─ Gas used: ${result.gasUsed}`);

      // Update game status
      const game = this.stakedGames.get(gameId);
      if (game) {
        game.status = 'completed';
        game.completedAt = Date.now();
        game.settlementTx = result.transactionHash;
      }

      // ✅ Format distributions for frontend (with FLOW conversion)
      const distributions = rewards.rewards.map((r) => ({
        playerAddress: r.playerAddress,
        role: r.role,
        stakeAmount: r.stakeAmount,
        rewardAmount: r.rewardAmount,
        totalReceived: r.totalReceived,
        // ✅ Convert wei to FLOW for display using blockchain service method
        stakeAmountInFLOW: this.blockchainService.formatFlow(r.stakeAmount),
        rewardInFLOW: this.blockchainService.formatFlow(r.rewardAmount),
        totalReceivedInFLOW: this.blockchainService.formatFlow(r.totalReceived),
      }));

      return {
        success: true,
        gameId: gameId,
        settlementTxHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        explorerLink: `https://evm-testnet.flowscan.io/tx/${result.transactionHash}`, // ✅ ADDED
        distributions: distributions,
        totalPool: rewards.totalPool,
        houseCut: rewards.houseCut,
        rewardPool: rewards.rewardPool,
      };
    } catch (error) {
      console.error('❌ Error distributing rewards:', error);
      console.error('Error details:', error.message);
      throw error;
    }
  }

  // ============================================
  // CHANGE 5: Update stakeForGame (line 97-164) - OPTIONAL
  // ============================================

  // BEFORE (line 129-130):
  /*
  const aptosService = new (require('./AptosService'))();
  const txHash = await aptosService.joinGame(gameId, playerAddress);
  */

  // AFTER - Option A (Recommended): Remove on-chain join from backend
  // In Flow EVM, players join games directly from frontend using MetaMask
  async stakeForGame(gameId, playerAddress, roomCode) {
    try {
      console.log(`💰 Player ${playerAddress} staking for game ${gameId}`);
      console.log(`⚠️ Note: Player must join game on-chain via frontend (MetaMask)`);

      if (!this.validateRoomCode(roomCode)) {
        throw new Error('Invalid room code');
      }

      if (!this.stakedGames.has(gameId)) {
        this.stakedGames.set(gameId, {
          roomCode: roomCode,
          players: [],
          totalStaked: 0,
          status: 'waiting',
          createdAt: Date.now()
        });
      }

      const game = this.stakedGames.get(gameId);

      if (game.players.includes(playerAddress)) {
        throw new Error('Player already staked for this game');
      }

      if (game.players.length >= this.minPlayers) {
        throw new Error('Game is full');
      }

      if (game.status !== 'waiting') {
        throw new Error('Game has already started');
      }

      // ✅ Option A: Verify player joined on-chain (recommended)
      if (this.blockchainService && this.blockchainService.isReady()) {
        try {
          const onChainGame = await this.blockchainService.getGameInfo(gameId);
          if (!onChainGame.players.includes(playerAddress)) {
            throw new Error('Player has not joined game on-chain yet. Please join via frontend first.');
          }
          console.log(`✅ Verified ${playerAddress} joined game ${gameId} on-chain`);
        } catch (error) {
          console.error('❌ Error verifying on-chain join:', error.message);
          throw new Error('Could not verify on-chain game join: ' + error.message);
        }
      }

      // Track player locally
      game.players.push(playerAddress);
      game.totalStaked += this.stakeAmount;

      this.playerStakes.set(`${gameId}-${playerAddress}`, {
        gameId: gameId,
        playerAddress: playerAddress,
        amount: this.stakeAmount,
        txHash: 'joined-via-frontend', // ✅ Placeholder since join happens on frontend
        timestamp: Date.now(),
        status: 'staked'
      });

      console.log(`💰 Player tracked! Game ${gameId} now has ${game.players.length}/${this.minPlayers} players`);

      if (game.players.length === this.minPlayers) {
        game.status = 'full';
        console.log(`🎮 Game ${gameId} is ready to start with full stake pool!`);
      }

      return {
        success: true,
        txHash: 'joined-via-frontend',
        amount: this.stakeAmount.toString(),
        gameStatus: game.status,
        playersCount: game.players.length,
        totalStaked: game.totalStaked.toString()
      };
    } catch (error) {
      console.error('❌ Error staking for game:', error);
      throw error;
    }
  }

  // ============================================
  // CHANGE 6: Update checkBalance (line 46-95) - OPTIONAL
  // ============================================

  // BEFORE:
  /*
  async checkBalance(playerAddress) {
    try {
      if (!this.aptos) {
        // mock balance
      }
      // Use Aptos SDK to get balance
      const balance = await this.aptos.getAccountAPTAmount({ accountAddress: playerAddress });
      // ...
    }
  }
  */

  // AFTER:
  async checkBalance(playerAddress) {
    try {
      console.log(`💰 Checking FLOW balance for ${playerAddress}`);

      if (!this.blockchainService || !this.blockchainService.isReady()) {
        console.log('⚠️ Blockchain service not ready, using mock balance');
        return {
          balance: "1000000000000000000", // 1 FLOW
          balanceInFLOW: "1.0",
          sufficient: true,
          mock: true
        };
      }

      // ✅ Use EVM provider to get balance
      const provider = this.blockchainService.provider;
      const balance = await provider.getBalance(playerAddress);

      console.log(`💰 Player ${playerAddress} balance: ${this.blockchainService.formatFlow(balance)} FLOW`);

      return {
        balance: balance.toString(),
        balanceInFLOW: this.blockchainService.formatFlow(balance),
        sufficient: balance >= BigInt(this.stakeAmount)
      };
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      throw error;
    }
  }

  // ============================================
  // All other methods remain the same:
  // - getGameStakingInfo()
  // - getPlayerStakeInfo()
  // - calculateRewards()
  // - validateRoomCode()
  // - getAllStakedGames()
  // - cleanupCompletedGames()
  // ============================================
}

module.exports = StakingService;

// ============================================
// SUMMARY OF CHANGES
// ============================================

/*
File: StakingService.js

Required changes:
1. Line 1-2: Remove Aptos SDK imports
2. Line 4-14: Update constructor to accept blockchainService
3. Line 16-44: REMOVE initialize() method entirely
4. Line 289-329: Completely rewrite distributeRewards()

Optional changes (recommended):
5. Line 97-164: Update stakeForGame() to verify on-chain joins
6. Line 46-95: Update checkBalance() to use EVM provider

Total changes: 4 required, 2 optional
Estimated time: 10-15 minutes
Complexity: Medium (mainly replacing Aptos SDK calls with EVM calls)
*/

// ============================================
// KEY DIFFERENCES: APTOS VS FLOW EVM
// ============================================

/*
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│ Aspect                   │ Aptos (Old)              │ Flow EVM (New)           │
├──────────────────────────┼──────────────────────────┼──────────────────────────┤
│ SDK                      │ @aptos-labs/ts-sdk       │ ethers.js                │
│ Private Key Format       │ ed25519-priv-0x...       │ 0x... (ECDSA)            │
│ Balance Check            │ getAccountAPTAmount()    │ provider.getBalance()    │
│ Settlement Function      │ submitSettlement(        │ submitSettlement(        │
│                          │   gameId, winners,       │   gameId, winners        │
│                          │   payouts, signature)    │ )                        │
│ Settlement Auth          │ ED25519 signature        │ Owner-only modifier      │
│ Payout Calculation       │ Backend calculates       │ Contract calculates      │
│ Currency Unit            │ Octas (10^-8 APT)        │ Wei (10^-18 FLOW)        │
│ Format Function          │ Manual / 100000000       │ ethers.formatEther()     │
│ Parse Function           │ Manual * 100000000       │ ethers.parseEther()      │
│ Join Game                │ Backend calls SDK        │ Frontend calls MetaMask  │
│ Transaction Hash         │ 64-char hex              │ 66-char hex (0x...)      │
│ Explorer                 │ explorer.aptoslabs.com   │ evm-testnet.flowscan.io  │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
*/

// ============================================
// TESTING YOUR CHANGES
// ============================================

/*
1. Update all three files:
   - server.js (or copy examples/server.flow-evm.js)
   - GameManager.js (apply changes from this file)
   - StakingService.js (apply changes from this file)

2. Ensure .env is configured:
   PEPASUR_CONTRACT_ADDRESS=0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c
   IS_SIMPLE_CONTRACT=true
   SERVER_PRIVATE_KEY=0xaf0e3c0f38439b5347fdf62b609f1cbcfa2b892a9a4d34da14cf2e8729dda421
   FLOW_EVM_RPC_URL=https://testnet.evm.nodes.onflow.org
   CHAIN_ID=545

3. Start server:
   npm run dev

4. Expected startup logs:
   🔷 Initializing EVM Service for Flow Testnet...
   🔑 Owner wallet initialized: 0x798b32BDf86253060d598038b1D77C98C36881D6
   ✅ Contract loaded successfully
   ✅ EVM Service initialized successfully
   💰 Staking service using injected blockchain service
   🚀 ASUR Backend server running on 0.0.0.0:3001
   📡 Socket.IO server ready for connections

5. Create and complete a test game to verify settlement works:
   - Create game via API or frontend
   - Simulate game completion
   - Verify settlement transaction on FlowScan
   - Check that winners can withdraw

6. Common errors and fixes:
   ❌ "Blockchain service not available"
      → Ensure EvmServiceSimple is passed to GameManager constructor

   ❌ "Not owner" on settlement
      → Verify SERVER_PRIVATE_KEY matches contract owner

   ❌ "Game not in progress"
      → Check game status on-chain before settling

   ❌ "Cannot find module 'ethers'"
      → Run: npm install ethers@^6.8.1
*/
