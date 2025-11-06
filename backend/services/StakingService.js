const crypto = require('crypto');

class StakingService {
  constructor(blockchainService = null) {
    this.stakeAmount = 100000; // Keep for backward compatibility
    this.minPlayers = 4;
    this.totalPool = 400000;
    this.stakedGames = new Map(); // Track staked games
    this.playerStakes = new Map(); // Track individual player stakes
    this.blockchainService = blockchainService; // Use injected blockchain service
    console.log('💰 Staking service initialized with blockchain service');
  }

  async checkBalance(playerAddress) {
    try {
      if (!this.aptos) {
        console.log('⚠️ Aptos client not initialized, using mock balance for testing');
        return {
          balance: "100000000", // 1 APT
          balanceInAPT: "1.0",
          sufficient: true,
          mock: true
        };
      }

      try {
        // Use getAccountAPTAmount - simpler and more reliable
        const balance = await this.aptos.getAccountAPTAmount({
          accountAddress: playerAddress
        });

        console.log(`💰 Player ${playerAddress} balance: ${balance / 100000000} APT`);

        return {
          balance: balance.toString(),
          balanceInAPT: (balance / 100000000).toString(),
          sufficient: balance >= this.stakeAmount
        };
      } catch (error) {
        console.log('⚠️ getAccountAPTAmount failed, trying getAccountResources...', error.message);

        // Fallback to getAccountResources
        const resources = await this.aptos.getAccountResources({
          accountAddress: playerAddress
        });
        const aptosCoinResource = resources.find(
          (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
        );
        const balance = aptosCoinResource ? parseInt(aptosCoinResource.data.coin.value) : 0;

        console.log(`💰 Player ${playerAddress} balance (Resources): ${balance / 100000000} APT`);

        return {
          balance: balance.toString(),
          balanceInAPT: (balance / 100000000).toString(),
          sufficient: balance >= this.stakeAmount
        };
      }
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      throw error;
    }
  }

  async stakeForGame(gameId, playerAddress, roomCode) {
    try {
      console.log(`💰 Player ${playerAddress} staking ${this.stakeAmount} APT for game ${gameId}`);
      
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

      const aptosService = new (require('./AptosService'))();
      const txHash = await aptosService.joinGame(gameId, playerAddress);

      game.players.push(playerAddress);
      game.totalStaked += this.stakeAmount;
      
      this.playerStakes.set(`${gameId}-${playerAddress}`, {
        gameId: gameId,
        playerAddress: playerAddress,
        amount: this.stakeAmount,
        txHash: txHash,
        timestamp: Date.now(),
        status: 'staked'
      });

      console.log(`💰 Stake successful! Game ${gameId} now has ${game.players.length}/${this.minPlayers} players`);
      console.log(`💰 Total staked: ${game.totalStaked} APT`);

      if (game.players.length === this.minPlayers) {
        game.status = 'full';
        console.log(`🎮 Game ${gameId} is ready to start with full stake pool!`);
      }

      return {
        success: true,
        txHash: txHash,
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

  getGameStakingInfo(gameId) {
    const game = this.stakedGames.get(gameId);
    if (!game) {
      return null;
    }

    return {
      gameId: gameId,
      roomCode: game.roomCode,
      players: game.players,
      playersCount: game.players.length,
      minPlayers: this.minPlayers,
      totalStaked: game.totalStaked.toString(),
      totalStakedInAPT: (game.totalStaked / 100000000).toString(),
      status: game.status,
      createdAt: game.createdAt,
      isReady: game.players.length === this.minPlayers
    };
  }

  // Get player's stake info
  getPlayerStakeInfo(gameId, playerAddress) {
    const stakeKey = `${gameId}-${playerAddress}`;
    const stake = this.playerStakes.get(stakeKey);
    
    if (!stake) {
      return null;
    }

    return {
      gameId: stake.gameId,
      playerAddress: stake.playerAddress,
      amount: stake.amount.toString(),
      amountInAPT: (stake.amount / 100000000).toString(),
      txHash: stake.txHash,
      timestamp: stake.timestamp,
      status: stake.status
    };
  }

  calculateRewards(gameId, winners, losers, gameRoles, eliminatedPlayers) {
    try {
      const game = this.stakedGames.get(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      // Use BigInt for large Wei amounts
      const totalPool = BigInt(game.totalStaked);
      const houseCutBps = 200n; // 2%
      const houseCut = (totalPool * houseCutBps) / 10000n;
      const rewardPool = totalPool - houseCut;

      // Calculate actual stake per player from the total pool
      const playerCount = BigInt(game.players.length);
      const stakePerPlayer = playerCount > 0n ? totalPool / playerCount : 0n;

      const rewards = [];
      const mafiaWon = winners.some((player) => gameRoles[player] === 'Mafia');

      if (mafiaWon) {
        const mafiaPlayers = winners.filter((player) => gameRoles[player] === 'Mafia');
        const mafiaRewardPerPlayer = mafiaPlayers.length > 0 ? rewardPool / BigInt(mafiaPlayers.length) : 0n;

        mafiaPlayers.forEach((playerAddress) => {
          rewards.push({
            playerAddress: playerAddress,
            role: 'ASUR',
            stakeAmount: stakePerPlayer.toString(),
            rewardAmount: mafiaRewardPerPlayer.toString(),
            totalReceived: mafiaRewardPerPlayer.toString(), // Winner only gets reward, not stake back
          });
        });

        losers.forEach((playerAddress) => {
          rewards.push({
            playerAddress: playerAddress,
            role: gameRoles[playerAddress] === 'Doctor' ? 'DEVA' : gameRoles[playerAddress] === 'Detective' ? 'RISHI' : 'MANAV',
            stakeAmount: stakePerPlayer.toString(),
            rewardAmount: '0',
            totalReceived: '0',
          });
        });
      } else {
        const allPlayers = Object.keys(gameRoles);
        const nonMafiaPlayers = allPlayers.filter((player) => gameRoles[player] !== 'Mafia');
        const nonMafiaRewardPerPlayer = nonMafiaPlayers.length > 0 ? rewardPool / BigInt(nonMafiaPlayers.length) : 0n;

        nonMafiaPlayers.forEach((playerAddress) => {
          rewards.push({
            playerAddress: playerAddress,
            role: gameRoles[playerAddress] === 'Doctor' ? 'DEVA' : gameRoles[playerAddress] === 'Detective' ? 'RISHI' : 'MANAV',
            stakeAmount: stakePerPlayer.toString(),
            rewardAmount: nonMafiaRewardPerPlayer.toString(),
            totalReceived: nonMafiaRewardPerPlayer.toString(), // Winner only gets reward, not stake back
          });
        });

        losers.forEach((playerAddress) => {
          if (gameRoles[playerAddress] === 'Mafia') {
            rewards.push({
              playerAddress: playerAddress,
              role: 'ASUR',
              stakeAmount: stakePerPlayer.toString(),
              rewardAmount: '0',
              totalReceived: '0',
            });
          }
        });
      }

      return {
        gameId: gameId,
        totalPool: totalPool.toString(),
        houseCut: houseCut.toString(),
        rewardPool: rewardPool.toString(),
        rewards: rewards,
      };
    } catch (error) {
      console.error('❌ Error calculating rewards:', error);
      throw error;
    }
  }

  async distributeRewards(gameId, rewards) {
    try {
      console.log(`💰 distributeRewards called for game ${gameId}`);

      // Check blockchain service availability
      if (!this.blockchainService || !this.blockchainService.isReady()) {
        throw new Error('Blockchain service not available or not ready');
      }

      // Extract only winners (players with non-zero rewards)
      const winners = rewards.rewards
        .filter((r) => BigInt(r.totalReceived) > 0n)
        .map((r) => r.playerAddress);

      if (winners.length === 0) {
        throw new Error('No winners to distribute rewards to');
      }

      console.log(`💰 Settling game ${gameId} with ${winners.length} winners`);
      console.log(`💰 Winners:`, winners);
      console.log(`💰 Total pool: ${rewards.totalPool} wei`);

      // Call blockchain settlement (EvmServiceSimple.submitSettlement)
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

      // Format distributions for frontend (with FLOW conversion)
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
        gasUsed: result.gasUsed,
        explorerLink: `https://evm-testnet.flowscan.io/tx/${result.transactionHash}`,
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

  // Validate room code format
  validateRoomCode(roomCode) {
    // Room code should be 6 characters, alphanumeric
    return /^[A-Z0-9]{6}$/.test(roomCode);
  }

  // Get all staked games
  getAllStakedGames() {
    const games = [];
    for (const [gameId, game] of this.stakedGames) {
      games.push({
        gameId: gameId,
        roomCode: game.roomCode,
        players: game.players,
        playersCount: game.players.length,
        minPlayers: this.minPlayers,
        totalStaked: game.totalStaked.toString(),
        totalStakedInAPT: (game.totalStaked / 100000000).toString(),
        status: game.status,
        createdAt: game.createdAt,
        isReady: game.players.length === this.minPlayers
      });
    }
    return games;
  }

  // Clean up completed games (optional)
  cleanupCompletedGames() {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours

    for (const [gameId, game] of this.stakedGames) {
      if (game.status === 'completed' && (now - game.completedAt) > oneDayMs) {
        this.stakedGames.delete(gameId);
        console.log(`🧹 Cleaned up completed game ${gameId}`);
      }
    }
  }
}

module.exports = StakingService;
