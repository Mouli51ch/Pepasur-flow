const crypto = require('crypto');

class SocketManager {
  constructor(io, gameManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.playerSockets = new Map(); // address -> socket
    this.socketGames = new Map(); // socketId -> gameId
    this.disconnectTimers = new Map(); // playerAddress -> timeout ID
    this.DISCONNECT_GRACE_PERIOD = 60 * 1000; // 60 seconds
  }

  handleJoinGame(socket, data) {
    const { gameId, playerAddress } = data;

    console.log('🔌 handleJoinGame called:', {
      gameId,
      playerAddress,
      playerAddressType: typeof playerAddress
    });

    if (!gameId || !playerAddress) {
      socket.emit('error', { message: 'Missing gameId or playerAddress' });
      return;
    }

    const game = this.gameManager.getGame(gameId);
    if (!game) {
      console.log('❌ Game not found:', gameId);
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    console.log('🎮 Game found. Current players:', game.players);
    console.log('🎮 Checking if playerAddress is in players:', {
      playerAddress,
      isInArray: game.players.includes(playerAddress),
      arrayContents: game.players
    });

    // Check if player is in the game
    if (!game.players.includes(playerAddress)) {
      console.log('❌ Player not in game. Players in game:', game.players);
      socket.emit('error', { message: 'Player not in game' });
      return;
    }

    // Cancel any pending disconnect timer (player reconnecting)
    if (this.disconnectTimers.has(playerAddress)) {
      console.log(`🔄 Player ${playerAddress} reconnected - canceling disconnect timer`);
      clearTimeout(this.disconnectTimers.get(playerAddress));
      this.disconnectTimers.delete(playerAddress);

      // Notify other players of reconnection
      socket.to(`game-${gameId}`).emit('game_update', {
        type: 'player_reconnected',
        playerAddress,
        timestamp: Date.now()
      });
    }

    // Join game room
    socket.join(`game-${gameId}`);
    this.playerSockets.set(playerAddress, socket);
    this.socketGames.set(socket.id, gameId);

    // Send current game state
    socket.emit('game_state', {
      gameId,
      game: this.gameManager.getPublicGameState(gameId)
    });

    // Notify other players
    socket.to(`game-${gameId}`).emit('game_update', {
      type: 'player_joined',
      playerAddress,
      timestamp: Date.now()
    });

    console.log(`Player ${playerAddress} joined game ${gameId}`);
  }

  handleDisconnect(socket) {
    const gameId = this.socketGames.get(socket.id);
    if (gameId) {
      // Find player address
      let playerAddress = null;
      for (const [address, sock] of this.playerSockets.entries()) {
        if (sock.id === socket.id) {
          playerAddress = address;
          break;
        }
      }

      if (playerAddress) {
        const game = this.gameManager.getGame(gameId);

        // Only use grace period for active games (not lobby)
        if (game && game.phase !== 'lobby') {
          console.log(`⏳ Player ${playerAddress} disconnected from active game ${gameId} - starting ${this.DISCONNECT_GRACE_PERIOD / 1000}s grace period`);

          // Notify other players of temporary disconnect
          this.io.to(`game-${gameId}`).emit('game_update', {
            type: 'player_disconnected_temporary',
            playerAddress,
            gracePeriod: this.DISCONNECT_GRACE_PERIOD,
            timestamp: Date.now()
          });

          // Start grace period timer
          const timer = setTimeout(async () => {
            console.log(`❌ Player ${playerAddress} did not reconnect within grace period - marking as AFK/eliminated`);

            try {
              // Mark player as eliminated (forfeit)
              await this.gameManager.leaveGame(gameId, playerAddress);

              // Notify all players
              this.io.to(`game-${gameId}`).emit('game_update', {
                type: 'player_afk',
                playerAddress,
                timestamp: Date.now()
              });
            } catch (error) {
              console.error(`❌ Error handling AFK player ${playerAddress}:`, error);
            }

            // Cleanup
            this.disconnectTimers.delete(playerAddress);
            this.playerSockets.delete(playerAddress);
          }, this.DISCONNECT_GRACE_PERIOD);

          // Store timer for potential cancellation on reconnect
          this.disconnectTimers.set(playerAddress, timer);
        } else {
          // Lobby phase - remove immediately
          console.log(`👋 Player ${playerAddress} disconnected from lobby ${gameId} - removing immediately`);
          this.playerSockets.delete(playerAddress);
          socket.to(`game-${gameId}`).emit('game_update', {
            type: 'player_disconnected',
            playerAddress,
            timestamp: Date.now()
          });
        }
      }
    }
    this.socketGames.delete(socket.id);
  }

  handleSubmitAction(socket, data) {
    const { gameId, action, commit } = data;
    const game = this.gameManager.getGame(gameId);

    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Validate action based on game phase
    if (game.phase === 'night') {
      this.gameManager.submitNightAction(gameId, data);
    } else if (game.phase === 'voting') {
      this.gameManager.submitVote(gameId, data);
    }

    // Broadcast action submission
    this.io.to(`game-${gameId}`).emit('game_update', {
      type: 'action_submitted',
      playerAddress: data.playerAddress,
      phase: game.phase,
      timestamp: Date.now()
    });
  }

  handleSubmitTask(socket, data) {
    const { gameId, answer } = data;
    const game = this.gameManager.getGame(gameId);

    if (!game || game.phase !== 'task') {
      socket.emit('error', { message: 'Invalid game phase for task submission' });
      return;
    }

    const result = this.gameManager.submitTaskAnswer(gameId, data);

    this.io.to(`game-${gameId}`).emit('task_update', {
      playerAddress: data.playerAddress,
      answer: result.correct ? 'correct' : 'incorrect',
      timestamp: Date.now()
    });

    if (result.gameComplete) {
      this.io.to(`game-${gameId}`).emit('task_result', {
        completed: true,
        winners: result.winners,
        timestamp: Date.now()
      });
    }
  }

  handleSubmitVote(socket, data) {
    const { gameId, vote } = data;
    const game = this.gameManager.getGame(gameId);

    if (!game || game.phase !== 'voting') {
      socket.emit('error', { message: 'Invalid game phase for voting' });
      return;
    }

    this.gameManager.submitVote(gameId, data);

    this.io.to(`game-${gameId}`).emit('game_update', {
      type: 'vote_submitted',
      playerAddress: data.playerAddress,
      timestamp: Date.now()
    });
  }

  handleChatMessage(socket, data) {
    const { gameId, message } = data;
    const game = this.gameManager.getGame(gameId);

    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    this.io.to(`game-${gameId}`).emit('chat_message', {
      gameId,
      playerAddress: data.playerAddress,
      message,
      timestamp: Date.now()
    });
  }

  // Emit chat message from server (e.g., task announcements, system messages)
  emitChatMessage(gameId, data) {
    try {
      console.log(`📢 Emitting chat message for game ${gameId}:`, data);
      this.io.to(`game-${gameId}`).emit('chat_message', {
        gameId,
        ...data
      });
    } catch (error) {
      console.error(`❌ Error emitting chat message for game ${gameId}:`, error);
    }
  }

  // Broadcast game state updates
  broadcastGameUpdate(gameId, update) {
    this.io.to(`game-${gameId}`).emit('game_update', {
      ...update,
      timestamp: Date.now()
    });
  }

  // Send message to specific player
  sendToPlayer(playerAddress, event, data) {
    const socket = this.playerSockets.get(playerAddress);
    if (socket) {
      socket.emit(event, data);
    }
  }

  // Emit game state update to all players in a game
  emitGameStateUpdate(gameId) {
    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) {
        console.log(`⚠️ Game not found for emitGameStateUpdate: ${gameId}`);
        return;
      }

      if (!this.io) {
        console.log(`⚠️ Socket.IO instance not available for emitGameStateUpdate: ${gameId}`);
        return;
      }

      console.log(`📡 Emitting game state update for game ${gameId}, phase: ${game.phase}`);

      // Create a clean, serializable game object (avoid circular references)
      const cleanGame = {
        gameId: game.gameId,
        roomCode: game.roomCode,
        creator: game.creator,
        players: game.players,
        roles: game.roles,
        phase: game.phase,
        timeLeft: game.timeLeft,
        day: game.day,
        eliminated: game.eliminated,
        nightResolution: game.nightResolution,
        task: game.task,
        votes: game.votes,
        pendingActions: game.pendingActions,
        startedAt: game.startedAt,
        roleCommit: game.roleCommit,
        rewards: game.rewards,
        winners: game.winners,
        status: game.status,
        votingResolved: game.votingResolved
      };

      // Emit to all players in the game
      this.io.to(`game-${gameId}`).emit('game_state', {
        gameId: gameId,
        game: cleanGame
      });

      // Also emit a general game update
      this.io.to(`game-${gameId}`).emit('game_update', {
        gameId: gameId,
        phase: game.phase,
        timeLeft: game.timeLeft
      });

      console.log(`✅ Successfully emitted game state update for game ${gameId}`);
    } catch (error) {
      console.error(`❌ Error emitting game state update for game ${gameId}:`, error);
    }
  }

  // Emit task result for announcements
  emitTaskResult(gameId, data) {
    try {
      console.log(`📢 Emitting task result for game ${gameId}:`, data);
      this.io.to(`game-${gameId}`).emit('task_result', data);
    } catch (error) {
      console.error(`❌ Error emitting task result for game ${gameId}:`, error);
    }
  }
}

module.exports = SocketManager;
