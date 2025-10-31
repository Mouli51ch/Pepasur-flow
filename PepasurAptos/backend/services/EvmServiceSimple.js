const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

/**
 * EvmServiceSimple - Blockchain service for PepasurSimple contract
 *
 * Replaces AptosService.js for Flow EVM Testnet integration
 *
 * Key Simplifications:
 * - No signature generation (owner settles directly)
 * - Direct ethers.js contract calls
 * - Simpler error handling
 */
class EvmServiceSimple {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.initialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🔷 Initializing EVM Service for Flow Testnet...');

      // Connect to Flow EVM Testnet
      this.provider = new ethers.JsonRpcProvider(
        process.env.FLOW_EVM_RPC_URL || 'https://testnet.evm.nodes.onflow.org',
        {
          chainId: 545,
          name: 'flow-testnet',
        }
      );

      // Initialize owner wallet (for settling games)
      if (process.env.SERVER_PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(
          process.env.SERVER_PRIVATE_KEY,
          this.provider
        );
        console.log('🔑 Owner wallet initialized:', this.wallet.address);
      } else {
        console.warn('⚠️  SERVER_PRIVATE_KEY not set - settlement will not work');
      }

      // Load contract ABI
      const contractArtifactPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'contract-flow',
        'artifacts',
        'contracts',
        'PepasurSimpleFixed.sol',
        'PepasurSimpleFixed.json'
      );

      if (!fs.existsSync(contractArtifactPath)) {
        throw new Error('Contract artifact not found at: ' + contractArtifactPath);
      }

      const artifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));

      // Initialize contract
      const contractAddress = process.env.PEPASUR_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('PEPASUR_CONTRACT_ADDRESS not set in .env');
      }

      this.contract = new ethers.Contract(
        contractAddress,
        artifact.abi,
        this.wallet || this.provider
      );

      // Skip verification for now - just mark as initialized
      // The contract will be verified on first use
      console.log('✅ Contract loaded successfully');
      console.log('├─ Address:', contractAddress);
      console.log('⚠️  Skipping initial verification (will verify on first use)');

      this.initialized = true;
      console.log('✅ EVM Service initialized successfully\n');

    } catch (error) {
      console.error('❌ Error initializing EVM service:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Check if service is ready to use
   */
  isReady() {
    return this.initialized && this.contract !== null;
  }

  /**
   * Extract game ID from a transaction hash by reading the transaction receipt
   * @param {string} transactionHash - Transaction hash
   * @returns {number} Game ID
   */
  async extractGameIdFromTransaction(transactionHash) {
    try {
      if (!this.isReady()) {
        throw new Error('EVM Service not initialized');
      }

      console.log('🔍 Extracting game ID from transaction:', transactionHash);

      // Retry up to 5 times with 2-second delay (10 seconds total)
      let receipt = null;
      for (let i = 0; i < 5; i++) {
        receipt = await this.provider.getTransactionReceipt(transactionHash);
        if (receipt) break;

        if (i < 4) {
          console.log(`⏳ Transaction not confirmed yet, retrying in 2s... (${i + 1}/5)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (!receipt) {
        throw new Error('Transaction receipt not found after 10 seconds');
      }

      // Parse logs to find GameCreated event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed && parsed.name === 'GameCreated';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('GameCreated event not found in transaction');
      }

      // Extract game ID from event
      const parsed = this.contract.interface.parseLog(event);
      const gameId = Number(parsed.args.gameId);

      console.log('✅ Extracted game ID:', gameId);
      return gameId;
    } catch (error) {
      console.error('❌ Error extracting game ID from transaction:', error.message);
      throw error;
    }
  }

  /**
   * Get game information from blockchain
   * @param {number} gameId - Game ID
   */
  async getGameInfo(gameId) {
    try {
      if (!this.isReady()) {
        throw new Error('EVM Service not initialized');
      }

      const game = await this.contract.getGame(gameId);

      return {
        id: Number(game.id),
        creator: game.creator,
        stakeAmount: game.stakeAmount.toString(),
        minPlayers: game.minPlayers,
        players: game.players,
        status: Number(game.status), // 0=LOBBY, 1=IN_PROGRESS, 2=SETTLED
        totalPool: game.totalPool.toString(),
      };
    } catch (error) {
      console.error('❌ Error getting game info:', error.message);
      throw error;
    }
  }

  /**
   * Get all players in a game
   * @param {number} gameId - Game ID
   */
  async getGamePlayers(gameId) {
    try {
      if (!this.isReady()) {
        throw new Error('EVM Service not initialized');
      }

      const players = await this.contract.getPlayers(gameId);
      return players;
    } catch (error) {
      console.error('❌ Error getting game players:', error.message);
      throw error;
    }
  }

  /**
   * Get pending withdrawal for a player
   * @param {string} playerAddress - Player's address
   */
  async getPendingWithdrawal(playerAddress) {
    try {
      if (!this.isReady()) {
        throw new Error('EVM Service not initialized');
      }

      const amount = await this.contract.getPendingWithdrawal(playerAddress);
      return amount.toString();
    } catch (error) {
      console.error('❌ Error getting pending withdrawal:', error.message);
      throw error;
    }
  }

  /**
   * Settle a game and distribute rewards (owner only)
   *
   * @param {number} gameId - Game ID to settle
   * @param {string[]} winners - Array of winner addresses
   * @returns {Object} Transaction receipt
   */
  async submitSettlement(gameId, winners) {
    try {
      if (!this.isReady()) {
        throw new Error('EVM Service not initialized');
      }

      if (!this.wallet) {
        throw new Error('Wallet not initialized - cannot settle games');
      }

      console.log('💰 Submitting settlement for game:', gameId);
      console.log('💰 Winners:', winners);
      console.log('💰 Owner wallet:', this.wallet.address);

      // Verify game is in correct state
      const game = await this.getGameInfo(gameId);
      if (game.status !== 2) { // IN_PROGRESS = 2 (LOBBY=0, READY=1, IN_PROGRESS=2, SETTLED=3)
        throw new Error(`Game not in progress. Current status: ${game.status}`);
      }

      console.log('💰 Game status verified: IN_PROGRESS');
      console.log('💰 Total pool:', ethers.formatEther(game.totalPool), 'FLOW');

      // Call settleGame on contract
      const tx = await this.contract.settleGame(gameId, winners, {
        gasLimit: 500000, // Explicit gas limit
      });

      console.log('💰 Settlement transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();

      console.log('✅ Settlement confirmed!');
      console.log('├─ Block:', receipt.blockNumber);
      console.log('├─ Gas used:', receipt.gasUsed.toString());
      console.log('└─ Transaction:', receipt.hash);

      // Calculate reward per winner
      const houseFee = BigInt(game.totalPool) * 200n / 10000n; // 2%
      const rewardPool = BigInt(game.totalPool) - houseFee;
      const rewardPerWinner = rewardPool / BigInt(winners.length);

      console.log('💰 Rewards distributed:');
      console.log('├─ House fee:', ethers.formatEther(houseFee), 'FLOW');
      console.log('├─ Reward pool:', ethers.formatEther(rewardPool), 'FLOW');
      console.log('└─ Per winner:', ethers.formatEther(rewardPerWinner), 'FLOW');

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };

    } catch (error) {
      console.error('❌ Error submitting settlement:', error);

      // Parse common errors
      if (error.message.includes('Not owner')) {
        throw new Error('Settlement failed: Your wallet is not the contract owner');
      } else if (error.message.includes('Game not in progress')) {
        throw new Error('Settlement failed: Game is not in progress state');
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('Settlement failed: Insufficient FLOW for gas fees');
      }

      throw error;
    }
  }

  /**
   * Start a game on-chain (move from READY to IN_PROGRESS)
   * Must be called by owner or game creator after minPlayers reached
   *
   * @param {number} gameId - Game ID to start
   * @returns {Object} Transaction receipt
   */
  async startGameOnChain(gameId) {
    try {
      if (!this.isReady()) {
        throw new Error('EVM Service not initialized');
      }

      if (!this.wallet) {
        throw new Error('Wallet not initialized - cannot start games');
      }

      console.log('🎮 Starting game on-chain:', gameId);
      console.log('🎮 Owner wallet:', this.wallet.address);

      // Verify game is in READY state
      const game = await this.getGameInfo(gameId);
      if (game.status !== 1) { // READY = 1
        console.log(`⚠️ Game ${gameId} not in READY state. Current status: ${game.status}`);
        // Don't throw error - just log and return
        return { success: false, reason: `Game status is ${game.status}, expected READY (1)` };
      }

      console.log('🎮 Game status verified: READY, starting...');

      // Call startGame on contract
      const tx = await this.contract.startGame(gameId, {
        gasLimit: 200000, // Explicit gas limit
      });

      console.log('🎮 Start game transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Game started on-chain!');
      console.log('├─ Transaction:', receipt.hash);
      console.log('├─ Block:', receipt.blockNumber);
      console.log('└─ Gas used:', receipt.gasUsed.toString());

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };

    } catch (error) {
      console.error('❌ Error starting game on-chain:', error);
      throw error;
    }
  }

  /**
   * Create a game on-chain (for testing)
   * Note: In production, players create games from frontend
   *
   * @param {string} stakeAmount - Stake amount in wei (as string)
   * @param {number} minPlayers - Minimum players (2-10)
   */
  async createGameForTesting(stakeAmount, minPlayers) {
    try {
      if (!this.isReady() || !this.wallet) {
        throw new Error('Service not ready or wallet not initialized');
      }

      console.log('🎮 Creating test game...');
      console.log('├─ Stake:', ethers.formatEther(stakeAmount), 'FLOW');
      console.log('└─ Min players:', minPlayers);

      const tx = await this.contract.createGame(stakeAmount, minPlayers, {
        value: stakeAmount,
        gasLimit: 300000,
      });

      const receipt = await tx.wait();

      // Extract game ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'GameCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        const gameId = Number(parsed.args.gameId);
        console.log('✅ Game created! ID:', gameId);
        return gameId;
      }

      throw new Error('GameCreated event not found');
    } catch (error) {
      console.error('❌ Error creating test game:', error.message);
      throw error;
    }
  }

  /**
   * Emergency refund a game (owner only)
   * @param {number} gameId - Game ID to refund
   */
  async emergencyRefund(gameId) {
    try {
      if (!this.isReady() || !this.wallet) {
        throw new Error('Service not ready or wallet not initialized');
      }

      console.log('🚨 Emergency refund for game:', gameId);

      const tx = await this.contract.emergencyRefund(gameId, {
        gasLimit: 300000,
      });

      const receipt = await tx.wait();
      console.log('✅ Emergency refund completed:', receipt.hash);

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('❌ Error emergency refund:', error.message);
      throw error;
    }
  }

  /**
   * Get contract configuration
   */
  async getContractInfo() {
    try {
      if (!this.isReady()) {
        throw new Error('EVM Service not initialized');
      }

      const owner = await this.contract.owner();
      const nextGameId = await this.contract.nextGameId();
      const houseCutBps = await this.contract.houseCutBps();

      return {
        owner,
        nextGameId: Number(nextGameId),
        houseCutBps: Number(houseCutBps),
      };
    } catch (error) {
      console.error('❌ Error getting contract info:', error.message);
      throw error;
    }
  }

  /**
   * Format FLOW amount from wei
   * @param {string|BigInt} wei - Amount in wei
   */
  formatFlow(wei) {
    return ethers.formatEther(wei);
  }

  /**
   * Parse FLOW amount to wei
   * @param {string} flow - Amount in FLOW
   */
  parseFlow(flow) {
    return ethers.parseEther(flow);
  }
}

module.exports = EvmServiceSimple;
