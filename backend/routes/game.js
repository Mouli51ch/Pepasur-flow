const express = require('express');

module.exports = (gameManager, aptosService) => {
  const router = express.Router();

  // Create a new game (Flow EVM - game already created on-chain by frontend)
  router.post('/create', async (req, res) => {
    try {
      const { creatorAddress, stakeAmount, minPlayers, isPublic, transactionHash } = req.body;

      if (!creatorAddress) {
        return res.status(400).json({ error: 'Creator address is required' });
      }

      // For staking games on Flow EVM, game is already created on-chain
      if (stakeAmount && transactionHash) {
        console.log(`🎮 Registering game for creator: ${creatorAddress}`);
        console.log(`💰 Stake amount: ${stakeAmount} Wei (${stakeAmount / 1e18} FLOW)`);
        console.log(`🌐 Public: ${isPublic ? 'YES' : 'NO'}`);
        console.log(`📝 Transaction: ${transactionHash}`);

        // Try to extract gameId from the transaction, but don't fail if it doesn't work
        let contractGameId;
        try {
          contractGameId = await aptosService.extractGameIdFromTransaction(transactionHash);
          console.log(`🎮 Extracted contract gameId: ${contractGameId}`);
        } catch (error) {
          console.warn(`⚠️ Could not extract game ID from transaction, will use placeholder:`, error.message);
          // Use a temporary game ID - we'll get the real one later when needed
          contractGameId = Date.now().toString();
        }

        // Create room in game manager with contract gameId and public flag
        const { gameId, roomCode } = await gameManager.createGame(creatorAddress, stakeAmount, minPlayers, contractGameId, isPublic || false);

        res.json({
          success: true,
          gameId,
          roomCode,
          onChainGameId: contractGameId,
          transactionHash,
          isPublic: isPublic || false,
          message: 'Game registered successfully'
        });
      } else {
        // Non-staking game
        const { gameId, roomCode } = await gameManager.createGame(creatorAddress, stakeAmount, minPlayers, null, isPublic || false);

        res.json({
          success: true,
          gameId,
          roomCode,
          isPublic: isPublic || false,
          message: 'Game created successfully'
        });
      }
    } catch (error) {
      console.error('Error creating game:', error);
      res.status(500).json({ error: error.message });
    }
  });



  // Create game and join it (for room creators)
  router.post('/create-and-join', async (req, res) => {
    try {
      const { creatorAddress, stakeAmount, minPlayers, isPublic } = req.body;

      if (!creatorAddress || !stakeAmount) {
        return res.status(400).json({ error: 'Creator address and stake amount are required' });
      }

      console.log(`🎮 Creating game and joining for creator: ${creatorAddress}`);
      console.log(`💰 Stake amount: ${stakeAmount} Octas (${stakeAmount / 100000000} APT)`);
      console.log(`🌐 Public: ${isPublic ? 'YES' : 'NO'}`);

      // Step 1: Create the game on-chain with custom stake amount
      const contractGameId = await aptosService.createGame(stakeAmount, minPlayers || 4);
      console.log(`✅ Game created on-chain, contract gameId: ${contractGameId}`);

      // Step 2: Create room in game manager (user will stake from frontend)
      const { gameId: managerGameId, roomCode } = await gameManager.createGame(creatorAddress, stakeAmount, minPlayers || 4, contractGameId, isPublic || false);

      res.json({
        success: true,
        gameId: managerGameId, // Use game manager's gameId for socket communication
        contractGameId: contractGameId, // Keep contract gameId for staking transaction
        roomCode,
        isPublic: isPublic || false,
        message: 'Game created successfully. Creator can now stake to join.'
      });
    } catch (error) {
      console.error('Error creating and joining game:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get game state
  router.get('/:gameId', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerAddress } = req.query; // Get player address from query params
      
      let game;
      if (playerAddress) {
        // Include player's role if address provided
        game = gameManager.getGameStateWithPlayerRole(gameId, playerAddress);
      } else {
        // Public game state without roles
        game = gameManager.getPublicGameState(gameId);
      }
      
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.json({
        success: true,
        game
      });
    } catch (error) {
      console.error('Error getting game:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update game state (admin/server only)
  router.patch('/:gameId', (req, res) => {
    try {
      const { gameId } = req.params;
      const updates = req.body;
      
      const game = gameManager.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Apply updates
      Object.assign(game, updates);
      
      res.json({
        success: true,
        message: 'Game updated successfully'
      });
    } catch (error) {
      console.error('Error updating game:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Join game by room code
  router.post('/join-by-code', async (req, res) => {
    try {
      const { roomCode, playerAddress } = req.body;

      if (!roomCode || !playerAddress) {
        return res.status(400).json({ error: 'Room code and player address are required' });
      }

      const game = gameManager.joinGameByRoomCode(roomCode, playerAddress);

      res.json({
        success: true,
        game: gameManager.getPublicGameState(game.gameId),
        message: 'Player joined successfully'
      });
    } catch (error) {
      console.error('Error joining game by room code:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Leave a game (only in lobby phase)
  router.post('/leave', async (req, res) => {
    try {
      const { gameId, playerAddress } = req.body;

      if (!gameId || !playerAddress) {
        return res.status(400).json({ error: 'Game ID and player address are required' });
      }

      console.log(`👋 Leave game request: Player ${playerAddress} leaving game ${gameId}`);

      const result = await gameManager.leaveGame(gameId, playerAddress);

      res.json({
        success: true,
        cancelled: result.cancelled,
        remainingPlayers: result.remainingPlayers,
        message: result.cancelled
          ? 'Game cancelled'
          : 'Player left successfully'
      });
    } catch (error) {
      console.error('Error leaving game:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Record player stake (called after successful on-chain staking)
  router.post('/record-stake', async (req, res) => {
    try {
      const { gameId, playerAddress, transactionHash } = req.body;

      console.log('📥 record-stake request received:', {
        gameId,
        playerAddress,
        playerAddressType: typeof playerAddress,
        transactionHash
      });

      if (!gameId || !playerAddress || !transactionHash) {
        return res.status(400).json({ error: 'Game ID, player address, and transaction hash are required' });
      }

      await gameManager.recordPlayerStake(gameId, playerAddress, transactionHash);

      const game = gameManager.getGame(gameId);
      console.log('✅ Stake recorded. Game now has players:', game?.players);

      res.json({
        success: true,
        message: 'Stake recorded successfully'
      });
    } catch (error) {
      console.error('Error recording stake:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get game by room code
  router.get('/room/:roomCode', (req, res) => {
    try {
      const { roomCode } = req.params;
      const game = gameManager.getGameByRoomCode(roomCode);
      
      if (!game) {
        return res.status(404).json({ error: 'Room code not found' });
      }

      res.json({
        success: true,
        game: gameManager.getPublicGameState(game.gameId)
      });
    } catch (error) {
      console.error('Error getting game by room code:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Eliminate player
  router.post('/:gameId/player/eliminate', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerAddress } = req.body;
      
      const game = gameManager.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      if (!game.players.includes(playerAddress)) {
        return res.status(400).json({ error: 'Player not in game' });
      }

      if (game.eliminated.includes(playerAddress)) {
        return res.status(400).json({ error: 'Player already eliminated' });
      }

      game.eliminated.push(playerAddress);
      
      // Check win conditions
      if (gameManager.checkWinConditions(game)) {
        gameManager.endGame(gameId);
      }
      
      res.json({
        success: true,
        message: 'Player eliminated successfully'
      });
    } catch (error) {
      console.error('Error eliminating player:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Signal that frontend is ready for timer
  router.post('/:gameId/ready', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerAddress } = req.body;
      
      if (!gameId) {
        return res.status(400).json({ error: 'Game ID is required' });
      }

      if (!playerAddress) {
        return res.status(400).json({ error: 'Player address is required' });
      }

      gameManager.startTimerWhenReady(gameId, playerAddress);
      
      res.json({
        success: true,
        message: 'Player ready signal received'
      });
    } catch (error) {
      console.error('Error processing ready signal:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Submit night action
  router.post('/:gameId/action/night', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerAddress, action, commit } = req.body;
      
      gameManager.submitNightAction(gameId, { playerAddress, action, commit });
      
      res.json({
        success: true,
        message: 'Night action submitted successfully'
      });
    } catch (error) {
      console.error('Error submitting night action:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Submit task answer
  router.post('/:gameId/task/submit', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerAddress, answer } = req.body;
      
      const result = gameManager.submitTaskAnswer(gameId, { playerAddress, answer });
      
      res.json({
        success: true,
        correct: result.correct,
        message: 'Task answer submitted successfully'
      });
    } catch (error) {
      console.error('Error submitting task answer:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Submit vote
  router.post('/:gameId/vote/submit', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerAddress, vote } = req.body;
      
      gameManager.submitVote(gameId, { playerAddress, vote });
      
      res.json({
        success: true,
        message: 'Vote submitted successfully'
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get game history
  router.get('/:gameId/history', (req, res) => {
    try {
      const { gameId } = req.params;
      const game = gameManager.getGame(gameId);
      
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const history = {
        gameId,
        creator: game.creator,
        players: game.players,
        eliminated: game.eliminated,
        winners: game.winners,
        day: game.day,
        phase: game.phase,
        startedAt: game.startedAt,
        status: game.status
      };
      
      res.json({
        success: true,
        history
      });
    } catch (error) {
      console.error('Error getting game history:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active games
  router.get('/', (req, res) => {
    try {
      const games = [];

      for (const [gameId, game] of gameManager.games.entries()) {
        if (game.status === 'active') {
          games.push({
            gameId,
            creator: game.creator,
            players: game.players.length,
            maxPlayers: game.maxPlayers,
            stakeAmount: game.stakeAmount,
            phase: game.phase,
            day: game.day,
            startedAt: game.startedAt
          });
        }
      }

      res.json({
        success: true,
        games
      });
    } catch (error) {
      console.error('Error getting active games:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all public lobbies
  router.get('/public/lobbies', async (req, res) => {
    try {
      const lobbies = await gameManager.getPublicLobbies();

      // Calculate win probabilities for each lobby
      const lobbiesWithProbabilities = lobbies.map(lobby => {
        const totalPot = lobby.stakeAmount * lobby.playerCount;
        const netPot = totalPot * 0.98; // After 2% house cut

        // Assuming 1 mafia, rest are non-mafia
        const mafiaCount = 1;
        const nonMafiaCount = lobby.minPlayers - mafiaCount;

        const mafiaWinPercent = lobby.playerCount > 0
          ? Math.round(((netPot / mafiaCount) / lobby.stakeAmount - 1) * 100)
          : 0;
        const nonMafiaWinPercent = lobby.playerCount > 0
          ? Math.round(((netPot / nonMafiaCount) / lobby.stakeAmount - 1) * 100)
          : 0;

        return {
          ...lobby,
          playerCount: lobby.currentPlayers.length,
          mafiaWinPercent,
          nonMafiaWinPercent
        };
      });

      res.json({
        success: true,
        lobbies: lobbiesWithProbabilities
      });
    } catch (error) {
      console.error('Error getting public lobbies:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle game visibility
  router.patch('/:gameId/visibility', async (req, res) => {
    try {
      const { gameId } = req.params;
      const { creatorAddress } = req.body;

      console.log('🔄 Toggle visibility request:', { gameId, creatorAddress });

      if (!creatorAddress) {
        return res.status(400).json({ error: 'Creator address is required' });
      }

      const result = await gameManager.toggleGameVisibility(gameId, creatorAddress);

      console.log('✅ Visibility toggled successfully:', result);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('❌ Error toggling game visibility:', error.message);
      console.error('❌ Full error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get win probabilities for a game
  router.get('/:gameId/win-probabilities', (req, res) => {
    try {
      const { gameId } = req.params;
      const game = gameManager.getGame(gameId);

      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const totalPot = game.stakeAmount * game.players.length;
      const netPot = totalPot * 0.98; // After 2% house cut

      // Assuming 1 mafia, rest are non-mafia
      const mafiaCount = 1;
      const nonMafiaCount = game.minPlayers - mafiaCount;

      const mafiaWinPercent = game.players.length > 0
        ? Math.round(((netPot / mafiaCount) / game.stakeAmount - 1) * 100)
        : 0;
      const nonMafiaWinPercent = game.players.length > 0
        ? Math.round(((netPot / nonMafiaCount) / game.stakeAmount - 1) * 100)
        : 0;

      res.json({
        success: true,
        stakeAmount: game.stakeAmount,
        stakeAmountInAPT: (game.stakeAmount / 100000000).toFixed(4),
        playerCount: game.players.length,
        minPlayers: game.minPlayers,
        totalPot,
        totalPotInAPT: (totalPot / 100000000).toFixed(4),
        netPot,
        netPotInAPT: (netPot / 100000000).toFixed(4),
        mafiaWinPercent,
        nonMafiaWinPercent
      });
    } catch (error) {
      console.error('Error calculating win probabilities:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
