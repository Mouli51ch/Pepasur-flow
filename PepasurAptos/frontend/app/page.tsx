"use client"

import { useState, useEffect } from "react"
import LoaderScreen from "@/components/loader-screen"
import WalletConnect from "@/components/wallet-connect"
import LobbyScreen from "@/components/lobby-screen"
import RoleAssignmentScreen from "@/components/role-assignment-screen"
import GameplayScreen from "@/components/gameplay-screen"
import GameResultsScreen from "@/components/game-results-screen"
import NightResolutionScreen from "@/components/night-resolution-screen"
import DiscussionPhaseScreen from "@/components/discussion-phase-screen"
import VotingScreen from "@/components/voting-screen"
import StakingScreen from "@/components/staking-screen"
import PublicLobbiesScreen from "@/components/public-lobbies-screen"

import { useGame, Player } from "@/hooks/useGame"
import { useAutoFullscreen } from "@/hooks/useAutoFullscreen"
import { soundService } from "@/services/SoundService"
import { saveGameSession, getGameSession, clearGameSession, isSessionValid, refreshSessionTimestamp } from "@/utils/sessionPersistence"

export type GameState = "loader" | "wallet" | "room-code-input" | "staking" | "public-lobbies" | "lobby" | "role-assignment" | "night" | "resolution" | "task" | "voting" | "ended"
export type Role = "ASUR" | "DEVA" | "RISHI" | "MANAV"

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("loader")
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null)
  const [stakingMode, setStakingMode] = useState<'create' | 'join'>('create')
  const [isLoadingGame, setIsLoadingGame] = useState(false)

  const {
    game,
    currentPlayer,
    players,
    isLoading,
    error,
    isConnected,
    currentGameId,
    setCurrentGameId,
    setCurrentPlayerFromAddress,
    refreshGame,
    submitNightAction,
    submitTaskAnswer,
    submitVote,
    resetGame,
  } = useGame()

  // Auto-fullscreen during gameplay phases (after game hook)
  useAutoFullscreen({
    enabled: true,
    gamePhases: ['night', 'task', 'voting'],
    currentPhase: game?.phase,
    delay: 500
  })

  useEffect(() => {
    if (gameState === "loader") {
      const timer = setTimeout(() => {
        setGameState("wallet")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [gameState])

  // Clear any stale sessions on app startup
  useEffect(() => {
    const savedSession = getGameSession()
    if (savedSession) {
      // Check if session is older than 3 minutes - likely stale
      const THREE_MINUTES = 3 * 60 * 1000
      const age = Date.now() - savedSession.timestamp
      if (age > THREE_MINUTES) {
        console.log('🧹 Clearing stale session on app startup')
        clearGameSession()
      }
    }
  }, [])

  const [hasSeenRole, setHasSeenRole] = useState(false)
  const [lastEliminatedPlayer, setLastEliminatedPlayer] = useState<string | null>(null)

  // Save session when entering lobby or during active game
  useEffect(() => {
    if (game?.gameId && currentRoomCode && walletAddress && game.phase !== 'ended') {
      saveGameSession(game.gameId, currentRoomCode, walletAddress)
    }
  }, [game?.gameId, currentRoomCode, walletAddress, game?.phase])

  // Periodic session refresh every 5 minutes during active games
  useEffect(() => {
    if (game?.gameId && game.phase !== 'ended') {
      const refreshInterval = setInterval(() => {
        refreshSessionTimestamp()
        console.log('🔄 Session timestamp refreshed')
      }, 5 * 60 * 1000) // 5 minutes

      return () => clearInterval(refreshInterval)
    }
  }, [game?.gameId, game?.phase])

  // Clear session when game ends
  useEffect(() => {
    if (game?.phase === 'ended') {
      console.log('🎮 Game ended, clearing session')
      clearGameSession()
    }
  }, [game?.phase])

  // Set loading flag when game data arrives
  useEffect(() => {
    if (game && currentGameId) {
      setIsLoadingGame(false)
    }
  }, [game, currentGameId])

  // Handle game cancellation or not found (when game becomes null while in lobby)
  // But don't cancel immediately - give socket time to deliver game state
  useEffect(() => {
    if (!game && gameState === 'lobby' && currentGameId && !isLoadingGame) {
      // Add a small delay to distinguish between "loading" and "cancelled/not found"
      const cancelTimer = setTimeout(() => {
        console.log('🚫 Game was cancelled or not found, returning to wallet screen')
        clearGameSession()
        setCurrentGameId(undefined)
        setCurrentRoomCode(null)
        setIsLoadingGame(false)
        setGameState('wallet')
        setHasSeenRole(false)
      }, 2000) // Wait 2 seconds before considering it cancelled

      return () => clearTimeout(cancelTimer)
    }
  }, [game, gameState, currentGameId, setCurrentGameId, isLoadingGame])

  // Handle socket errors by clearing invalid sessions
  useEffect(() => {
    if (error && error.toLowerCase().includes('not found')) {
      console.log('🧹 Socket error indicates invalid game, clearing session and returning to wallet')
      clearGameSession()
      setCurrentGameId(undefined)
      setCurrentRoomCode(null)
      setIsLoadingGame(false)
      setGameState('wallet')
      setHasSeenRole(false)
    }
  }, [error, setCurrentGameId])

  useEffect(() => {
    // Sync game phase to UI state
    if (game && currentPlayer) {
      if (game.phase !== gameState) {
        // Play appropriate sound for phase change
        if (game.phase === 'lobby') {
          soundService.playGameStart();
        } else if (game.phase === 'night') {
          soundService.playKilling();
        } else if (game.phase === 'task') {
          soundService.playClick();
        } else if (game.phase === 'voting') {
          soundService.playClick();
        } else if (game.phase === 'ended') {
          soundService.playPepasurLaugh();
        }
      }

      if (game.phase === 'lobby' && gameState !== 'lobby') {
        setGameState('lobby')
        setHasSeenRole(false)
      } else if (game.phase === 'night' && currentPlayer.role && !hasSeenRole) {
        // Play role-specific sound when showing role assignment
        if (currentPlayer.role === 'ASUR') {
          soundService.playPepasurLaugh();
        } else if (currentPlayer.role === 'DEVA') {
          soundService.playAngelic();
        } else if (currentPlayer.role === 'RISHI') {
          soundService.playDetective();
        }
        setGameState('role-assignment')
      } else if (game.phase === 'night' && gameState !== 'night' && hasSeenRole) {
        console.log('🌙 Transitioning to night phase, hasSeenRole:', hasSeenRole)
        setGameState('night')
      } else if (game.phase === 'resolution' && gameState !== 'resolution') {
        // Find the most recently eliminated player (last in the eliminated array)
        const newlyEliminated = game.eliminated.length > 0 ? game.eliminated[game.eliminated.length - 1] : null
        console.log('🔍 Resolution phase - newly eliminated:', newlyEliminated, 'all eliminated:', game.eliminated)
        setLastEliminatedPlayer(newlyEliminated)
        setGameState('resolution')
      } else if (game.phase === 'task' && gameState !== 'task') {
        setGameState('task')
      } else if (game.phase === 'voting' && gameState !== 'voting') {
        setGameState('voting')
      } else if (game.phase === 'ended' && gameState !== 'ended' && gameState !== 'wallet') {
        setGameState('ended')
      }
    }
  }, [game?.phase, gameState, currentPlayer?.id, currentPlayer?.role, hasSeenRole, refreshGame])

  const handleWalletAddressChange = (address: string | null) => {
    setWalletAddress(address)
    if (address) {
      setCurrentPlayerFromAddress(address)

      // Check for saved game session
      const savedSession = getGameSession()
      if (savedSession && isSessionValid(address)) {
        console.log('🔄 Attempting to restore previous game session:', savedSession)

        // Restore game state
        setCurrentGameId(savedSession.gameId)
        setCurrentRoomCode(savedSession.roomCode)
        setIsLoadingGame(true)

        // Explicitly fetch game state - socket error handler will clear invalid sessions
        setTimeout(() => {
          refreshGame()
          console.log('🔄 Fetching game state after session restoration')
        }, 500)

        // Navigate to lobby
        setGameState('lobby')
      }
    }
  }

  const handleJoinGame = () => {
    setStakingMode('join')
    setGameState("staking")
  }

  const handleCreateLobby = () => {
    setStakingMode('create')
    setGameState("staking")
  }

  const getPublicPlayerData = (players: Player[], currentPlayerId: string) => {
    return players.map(player => ({
      ...player,
      role: player.id === currentPlayerId ? player.role : undefined,
      // Always show public avatars (colored shirts) for everyone
      // Role avatars are already handled in convertPlayers
      avatar: player.avatar,
      isCurrentPlayer: player.id === currentPlayerId
    }))
  }

  return (
    <main className="min-h-screen gaming-bg relative overflow-hidden w-full">


      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-900/90 text-red-100 p-4 rounded border border-red-500">
          <div className="font-press-start text-sm">ERROR:</div>
          <div className="text-sm">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
          >
            Retry
          </button>
        </div>
      )}



      {isLoading && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-40">
          <div className="bg-[#111111]/40 p-3 rounded border border-[#2a2a2a]/30 text-center opacity-30">
            <div className="font-press-start text-white/50 mb-1 text-xs">LOADING...</div>
            <div className="text-xs text-gray-600">Connecting to game server</div>
          </div>
        </div>
      )}

      {gameState === "loader" && <LoaderScreen />}
      {gameState === "wallet" && (
        <WalletConnect
          onAddressChange={handleWalletAddressChange}
          onJoinGame={handleJoinGame}
          onCreateLobby={handleCreateLobby}
        />
      )}
      {gameState === "staking" && walletAddress && (
        <StakingScreen
          gameId={game?.gameId}
          playerAddress={walletAddress}
          mode={stakingMode}
          initialRoomCode={currentRoomCode || undefined}
          onStakeSuccess={(gameId, roomCode) => {
            console.log('🎯 onStakeSuccess - transitioning to lobby')
            setIsLoadingGame(true) // Expect game state to arrive soon
            if (gameId) setCurrentGameId(gameId)
            if (roomCode) setCurrentRoomCode(roomCode)
            setGameState("lobby")
          }}
          onCancel={() => {
            setCurrentRoomCode(null)
            setGameState("wallet")
          }}
          onBrowsePublicLobbies={() => setGameState("public-lobbies")}
        />
      )}
      {gameState === "public-lobbies" && walletAddress && (
        <PublicLobbiesScreen
          playerAddress={walletAddress}
          onJoinLobby={(gameId, roomCode) => {
            console.log('🎯 onJoinLobby - transitioning to lobby')
            setIsLoadingGame(true) // Expect game state to arrive soon
            setCurrentGameId(gameId)
            setCurrentRoomCode(roomCode)
            setGameState("lobby")
          }}
          onBack={() => setGameState("staking")}
        />
      )}
      {gameState === "lobby" && currentPlayer && (
        <>
          <LobbyScreen
            players={getPublicPlayerData(players, currentPlayer.id)}
            game={game}
            isConnected={isConnected}
            onStartGame={() => { }}
            playerAddress={currentPlayer.address}
            onLeaveGame={() => {
              console.log('🚪 Player leaving game - returning to home')
              clearGameSession()
              resetGame()
              setCurrentRoomCode(null)
              setIsLoadingGame(false)
              setGameState('wallet')
              setHasSeenRole(false)
              setLastEliminatedPlayer(null)
            }}
          />
        </>
      )}
      {gameState === "role-assignment" && currentPlayer?.role && currentPlayer?.avatar && (
        <RoleAssignmentScreen
          role={currentPlayer.role as Role}
          avatar={currentPlayer.avatar}
          onAcknowledge={() => setHasSeenRole(true)}
        />
      )}
      {gameState === "night" && currentPlayer && (
        <GameplayScreen
          currentPlayer={currentPlayer}
          players={getPublicPlayerData(players, currentPlayer.id)}
          game={game}
          submitNightAction={submitNightAction}
          isConnected={isConnected}
          refreshGame={refreshGame}
          onComplete={() => { }}
        />
      )}
      {gameState === "resolution" && game && (
        <NightResolutionScreen
          resolution={{
            killedPlayer: (() => {
              if (!lastEliminatedPlayer) return null;
              const found = players.find(p => p.address === lastEliminatedPlayer);
              console.log('🔍 Looking for eliminated player:', lastEliminatedPlayer, 'found:', found?.name);
              return found || null;
            })(),
            savedPlayer: null,
            investigatedPlayer: null,
            investigationResult: null,
            mafiaTarget: null,
            doctorTarget: null,
            detectiveTarget: null
          }}
          onContinue={() => { }}
          game={game}
          currentPlayer={currentPlayer || undefined}
        />
      )}
      {gameState === "task" && (
        <DiscussionPhaseScreen
          onComplete={() => { }}
          game={game}
          gameId={game?.gameId}
          currentPlayerAddress={currentPlayer?.address}
          submitTaskAnswer={submitTaskAnswer}
          players={players}
        />
      )}
      {gameState === "voting" && currentPlayer && (
        <VotingScreen
          players={getPublicPlayerData(players, currentPlayer.id)}
          game={game}
          currentPlayer={currentPlayer}
          submitVote={submitVote}
          isConnected={isConnected}
          onComplete={() => { }}
        />
      )}
      {game?.phase === 'ended' && (
        <GameResultsScreen
          game={game}
          players={players}
          currentPlayer={currentPlayer || undefined}
          onNewGame={() => {
            console.log('🎮 Starting new game - resetting all state')
            clearGameSession()
            resetGame()
            setCurrentRoomCode(null)
            setGameState('wallet')
            setHasSeenRole(false)
            setLastEliminatedPlayer(null)
          }}
        />
      )}

    </main>
  )
}