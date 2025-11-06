"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '@/contexts/EnhancedSocketContext'
import { apiService, Game, GameAction, TaskSubmission, VoteSubmission } from '@/services/api'
import { soundService } from '@/services/SoundService'
import { clearGameSession } from '@/utils/sessionPersistence'

export interface Player {
  id: string
  name: string
  avatar: string  // Always defined - colored shirt or role avatar
  role?: string
  isAlive: boolean
  isCurrentPlayer?: boolean
  address?: string
}

export interface GameState {
  game: Game | null
  currentPlayer: Player | null
  players: Player[]
  isLoading: boolean
  error: string | null
  isConnected: boolean
}

export interface GameActions {
  createGame: (creatorAddress: string, stakeAmount?: number, minPlayers?: number) => Promise<{ gameId: string; roomCode: string }>
  joinGame: (gameId: string, playerAddress: string) => Promise<void>
  joinGameByRoomCode: (roomCode: string, playerAddress: string) => Promise<void>
  submitNightAction: (action: any, commit?: string) => Promise<void>
  submitTaskAnswer: (answer: any) => Promise<void>
  submitVote: (vote: string) => Promise<void>
  eliminatePlayer: (playerAddress: string) => Promise<void>
  refreshGame: () => Promise<void>
  currentGameId?: string
  setCurrentGameId: (gameId: string | undefined) => void
  setCurrentPlayerFromAddress: (address: string) => void
  resetGame: () => void
}

export function useGame(gameId?: string): GameState & GameActions {
  const { socket, isConnected, joinGame: socketJoinGame, submitAction, submitTask, submitVote: socketSubmitVote, sendChatMessage } = useSocket()

  const [game, setGame] = useState<Game | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentGameId, setCurrentGameId] = useState<string | undefined>(gameId)
  const [processedTaskResults, setProcessedTaskResults] = useState<Set<string>>(new Set())
  const [sentAnnouncements, setSentAnnouncements] = useState<Set<string>>(new Set())

  // Color alias and avatar mapping (must stay in sync)
  const colorAliases = [
    { name: '0xRed', avatar: 'https://ik.imagekit.io/3rdfd9oed/pepAsur%20Assets/redShirt.png?updatedAt=1761611647221' },
    { name: '0xBlue', avatar: 'https://ik.imagekit.io/3rdfd9oed/pepAsur%20Assets/blueShirt.png?updatedAt=1758922659560' },
    { name: '0xPurple', avatar: 'https://ik.imagekit.io/3rdfd9oed/pepAsur%20Assets/purpleShirt.png?updatedAt=1761611647804' },
    { name: '0xYellow', avatar: 'https://ik.imagekit.io/3rdfd9oed/pepAsur%20Assets/yellowShirt.png?updatedAt=1761611647228' }
  ];

  // Generate username based on player index in game (ensures uniqueness)
  const generateUsername = useCallback((playerIndex: number): string => {
    // Use player's position in game to ensure unique aliases
    const colorAlias = colorAliases[playerIndex % colorAliases.length];
    console.log(`👤 Assigned alias ${colorAlias.name} to player at index ${playerIndex}`);
    return colorAlias.name;
  }, []);

  // Generate avatar based on player index (matches username)
  const generateAvatar = useCallback((playerIndex: number): string => {
    const colorAlias = colorAliases[playerIndex % colorAliases.length];
    console.log(`🎨 Assigned avatar ${colorAlias.avatar.split('/').pop()?.split('?')[0]} to player at index ${playerIndex}`);
    return colorAlias.avatar;
  }, []);

  // Convert backend players to frontend format
  const convertPlayers = useCallback((game: Game, currentPlayerAddress?: string): Player[] => {
    console.log('🔍 convertPlayers called with game:', {
      gameId: game.gameId,
      phase: game.phase,
      players: game.players,
      roles: game.roles,
      currentPlayerAddress
    })

    // Role mapping from backend to frontend
    const roleMapping: Record<string, string> = {
      'Mafia': 'ASUR',
      'Doctor': 'DEVA',
      'Detective': 'RISHI',
      'Villager': 'MANAV'
    }

    return game.players.map((address, index) => {
      const backendRole = game.roles?.[address] || ''
      const frontendRole = roleMapping[backendRole] || backendRole

      console.log(`Player ${index + 1} (${address}): ${backendRole} -> ${frontendRole}`)

      // Generate username and public avatar based on player index (ensures uniqueness)
      const username = generateUsername(index)
      const publicAvatar = generateAvatar(index) // This is the colored shirt matching the username

      // Determine which avatar to show
      let avatar = publicAvatar // Default: always show colored shirt

      const isCurrentPlayer = address === currentPlayerAddress
      const isEliminated = game.eliminated.includes(address)

      // Show role avatar ONLY in these cases:
      // 1. Current player sees their own role avatar (except in lobby)
      // 2. Eliminated players show their role avatar (revealed) - BUT NOT in voting/night phases
      const shouldShowRoleAvatar = frontendRole && isCurrentPlayer && game.phase !== 'lobby' && !isEliminated
      const shouldShowEliminatedRoleAvatar = frontendRole && isEliminated && game.phase !== 'voting' && game.phase !== 'night'

      if (shouldShowRoleAvatar || shouldShowEliminatedRoleAvatar) {
        if (frontendRole === 'DEVA') {
          avatar = 'https://ik.imagekit.io/3rdfd9oed/pepAsur%20Assets/dev.png?updatedAt=1758923141278'
        } else if (frontendRole === 'ASUR') {
          avatar = 'https://ik.imagekit.io/3rdfd9oed/pepAsur%20Assets/asur.png?updatedAt=1758922659571'
        } else if (frontendRole === 'RISHI') {
          avatar = 'https://ik.imagekit.io/3rdfd9oed/pepAsur%20Assets/sage.png?updatedAt=1758922659655'
        }
        // MANAV keeps the colored shirt even when revealed

        console.log(`🎭 ${frontendRole} role avatar shown for ${username}: ${avatar}`)
      } else {
        console.log(`👕 Public colored shirt shown for ${username}: ${avatar}`)
      }

      const player = {
        id: address,
        name: username,
        avatar: avatar,
        role: frontendRole,
        isAlive: !game.eliminated.includes(address),
        isCurrentPlayer: address === currentPlayerAddress,
        address
      }

      console.log(`👤 Created player: ${username}, avatar: ${avatar ? 'assigned' : 'MISSING'}`)
      return player
    })
  }, [generateUsername, generateAvatar])

  // Generate task result announcements with avatar
  const generateTaskAnnouncement = useCallback((player: Player, isSuccess: boolean): { message: string, type: string } => {
    const playerName = player.name || 'Unknown Player'

    const successMessages = [
      `${playerName} absolutely crushed it! Task count +1`,
      `${playerName}'s memory is on fire! Contributing like a boss!`,
      `${playerName} just flexed their brain muscles! Task count up!`,
      `${playerName} absolutely nailed it! Contributing like a legend!`,
      `${playerName} just dominated that task! Count goes up!`,
      `${playerName} showed everyone how it's done! Task count up!`,
      `${playerName} just aced that task! Task count +1`,
      `${playerName} just proved they're a genius! Count up!`
    ]

    const failureMessages = [
      `${playerName} totally fucked up that one! Task count -1`,
      `${playerName}'s brain went brrrr... wrong direction! Count down!`,
      `${playerName} had a smooth brain moment! Better luck next time!`,
      `${playerName} just embarrassed themselves! Task count -1`,
      `${playerName} just proved intelligence is optional! Task count -1`,
      `${playerName} just had a complete mental breakdown! Better luck next time!`,
      `${playerName}'s mind just crashed and burned!`,
      `${playerName} just slipped up big time! Try harder!`
    ]

    const messages = isSuccess ? successMessages : failureMessages
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]

    return {
      message: randomMessage,
      type: isSuccess ? 'task_success' : 'task_failure'
    }
  }, [])

  // Send task result announcement to chat
  const sendTaskAnnouncement = useCallback((player: Player, isSuccess: boolean) => {
    if (!game?.gameId || !sendChatMessage) return

    // Create unique key for this announcement to prevent duplicates
    const announcementKey = `${player.address}-${isSuccess}-${game.task?.id || 'unknown'}-${game?.day || 1}`

    // Check if we've already sent this announcement
    if (sentAnnouncements.has(announcementKey)) {
      console.log('🔄 Duplicate announcement prevented:', announcementKey)
      return
    }

    // Mark this announcement as sent immediately
    setSentAnnouncements(prev => {
      const newSet = new Set(prev)
      newSet.add(announcementKey)
      return newSet
    })

    const announcement = generateTaskAnnouncement(player, isSuccess)

    console.log('📢 Sending task announcement:', announcementKey, announcement.message)

    sendChatMessage({
      gameId: game.gameId,
      playerAddress: 'SYSTEM', // Mark as system message
      playerName: 'SYSTEM',
      avatarUrl: player.avatar, // Use the player's avatar who completed the task
      message: announcement.message,
      type: announcement.type,
      timestamp: new Date().toISOString()
    })
  }, [game?.gameId, game?.task?.id, game?.day, sendChatMessage, generateTaskAnnouncement, sentAnnouncements])

  // Reset game state and clear session
  const resetGame = useCallback(() => {
    console.log('🔄 Resetting game state and disconnecting socket')

    // Clear all game state
    setGame(null)
    setCurrentPlayer(null)
    setPlayers([])
    setCurrentGameId(undefined)
    setError(null)
    setIsLoading(false)

    // Clear session from localStorage
    clearGameSession()

    // Disconnect socket if connected
    if (socket && isConnected) {
      console.log('🔌 Disconnecting socket')
      socket.disconnect()
    }

    console.log('✅ Game reset complete')
  }, [socket, isConnected])

  // Socket event handlers
  useEffect(() => {
    if (!socket) return

    const handleGameState = (data: { gameId: string; game: Game }) => {
      console.log('🎮 SOCKET EVENT: Received game state:', data)
      console.log('🎮 Current player before update:', currentPlayer)
      console.log('🎮 Game phase in received data:', data.game?.phase)
      console.log('🎮 TimeLeft in received data:', data.game?.timeLeft)
      setGame(data.game)

      if (data.game) {
        // Try to get current player address from multiple sources
        const currentPlayerAddress = currentPlayer?.address ||
          (currentPlayer?.id && currentPlayer.id !== 'You' ? currentPlayer.id : null)

        console.log('Converting players with currentPlayer address:', currentPlayerAddress)
        const convertedPlayers = convertPlayers(data.game, currentPlayerAddress)
        setPlayers(convertedPlayers)

        // Update current player from converted players
        const currentPlayerFromConverted = convertedPlayers.find(p =>
          p.address === currentPlayerAddress ||
          (currentPlayerAddress && p.address === currentPlayerAddress)
        )

        if (currentPlayerFromConverted && currentPlayerFromConverted.role) {
          console.log(`[handleGameState] Updating current player role: ${currentPlayerFromConverted.role}`)
          setCurrentPlayer(prev => prev ? {
            ...prev,
            role: currentPlayerFromConverted.role,
            avatar: currentPlayerFromConverted.avatar,
            name: currentPlayerFromConverted.name // Update name too
          } : {
            id: currentPlayerFromConverted.id,
            name: currentPlayerFromConverted.name, // Use name from convertedPlayers
            avatar: currentPlayerFromConverted.avatar,
            isAlive: true,
            isCurrentPlayer: true,
            address: currentPlayerFromConverted.address,
            role: currentPlayerFromConverted.role
          })
        } else {
          console.log('No role found for current player:', currentPlayerFromConverted)
        }
      } else {
        console.log('No game data available')
      }
    }

    const handleGameUpdate = (data: any) => {
      console.log('🎮 Game update:', data)

      // Refresh game state when updates occur
      if (currentGameId) {
        refreshGame()
      }
    }

    const handleTaskUpdate = (data: any) => {
      console.log('🎮 Task update:', data)
    }

    const handleTaskResult = (data: { playerAddress: string; isSuccess: boolean; taskCount: number }) => {
      console.log('🎮 Task result received:', data)

      // Create unique key for this task result (more specific to prevent duplicates)
      const resultKey = `${data.playerAddress}-${data.isSuccess}-${game?.task?.id || 'unknown'}-${game?.day || 1}`

      // Check if we've already processed this result (prevent duplicates)
      if (processedTaskResults.has(resultKey)) {
        console.log('🔄 Duplicate task result ignored:', resultKey)
        return
      }

      // Mark this result as processed immediately
      setProcessedTaskResults(prev => {
        const newSet = new Set(prev)
        newSet.add(resultKey)
        return newSet
      })

      // Update task counts in game state
      if (game) {
        setGame(prev => prev ? {
          ...prev,
          taskCounts: {
            ...prev.taskCounts,
            [data.playerAddress]: data.taskCount
          }
        } : null)
      }

      // Note: Task announcements are now sent from the server to prevent duplicates
      // No need to send from client side anymore
      console.log(`📢 Task result processed for ${data.playerAddress}: ${data.isSuccess ? 'SUCCESS' : 'FAILURE'}, count: ${data.taskCount}`)
    }

    const handleChatMessage = (data: any) => {
      console.log('💬 Chat message:', data)
    }

    const handleError = (data: { message: string }) => {
      // If game not found, clear session instead of showing error (don't log as error)
      if (data.message.toLowerCase().includes('not found') ||
        data.message.toLowerCase().includes('game not found') ||
        data.message.toLowerCase().includes('invalid game')) {
        console.log('🧹 Game session expired or invalid - clearing session')
        resetGame()
        return
      }

      // Only log and show actual unexpected errors
      console.error('❌ Socket error:', data.message)
      setError(data.message)
    }

    const handleGameCancelled = (data: { gameId: string; reason: string }) => {
      console.log('🚫 Game cancelled:', data)
      setError(`Game cancelled: ${data.reason}`)
      // Clear game state
      setGame(null)
      setPlayers([])
      setCurrentGameId(null)
    }

    socket.on('game_state', handleGameState)
    socket.on('game_update', handleGameUpdate)
    socket.on('task_update', handleTaskUpdate)
    socket.on('task_result', handleTaskResult)
    socket.on('chat_message', handleChatMessage)
    socket.on('error', handleError)
    socket.on('game_cancelled', handleGameCancelled)

    return () => {
      socket.off('game_state', handleGameState)
      socket.off('game_update', handleGameUpdate)
      socket.off('task_update', handleTaskUpdate)
      socket.off('task_result', handleTaskResult)
      socket.off('chat_message', handleChatMessage)
      socket.off('error', handleError)
      socket.off('game_cancelled', handleGameCancelled)
    }
  }, [socket, currentGameId, convertPlayers, currentPlayer, players, sendTaskAnnouncement, resetGame])

  // Clear game state when currentGameId is set to null (player left game)
  useEffect(() => {
    if (currentGameId === null) {
      console.log('🧹 Clearing game state after leaving game')
      setGame(null)
      setCurrentPlayer(null)
      setPlayers([])
      setProcessedTaskResults(new Set())
      setSentAnnouncements(new Set())
    }
  }, [currentGameId])

  // Clear processed task results when task phase starts (new task)
  useEffect(() => {
    if (game?.phase === 'task' && game?.task?.id) {
      console.log('🧹 Clearing processed task results for new task phase:', game.task.id)
      setProcessedTaskResults(new Set())
      setSentAnnouncements(new Set())
    }
  }, [game?.phase, game?.task?.id])

  // Auto-join game when gameId changes (with duplicate prevention)
  useEffect(() => {
    if (currentGameId && currentPlayer?.address && isConnected) {
      console.log('🔌 Auto-joining socket game:', { currentGameId, playerAddress: currentPlayer.address })
      socketJoinGame(currentGameId, currentPlayer.address)
    }
  }, [currentGameId, currentPlayer?.address, isConnected, socketJoinGame])

  const createGame = useCallback(async (creatorAddress: string, stakeAmount = 10000000000000000, minPlayers = 4): Promise<{ gameId: string; roomCode: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 createGame - Starting API call:', { creatorAddress, stakeAmount, minPlayers })
      const response = await apiService.createGame({
        creatorAddress,
        stakeAmount,
        minPlayers
      })
      console.log('🔍 createGame - API response:', response)

      if (response.success) {
        console.log('🔍 createGame - Setting gameId:', response.gameId)
        console.log('🔍 createGame - Setting roomCode:', response.roomCode)
        // Set the game ID for tracking
        setCurrentGameId(response.gameId)

        // Set current player as creator (index 0 since creator is first player)
        // Will be updated with correct name/avatar when game state arrives via socket
        setCurrentPlayer({
          id: creatorAddress,
          name: generateUsername(0), // Creator is first player (index 0)
          avatar: generateAvatar(0), // Creator gets first color alias
          isAlive: true,
          isCurrentPlayer: true,
          address: creatorAddress
        })

        return { gameId: response.gameId, roomCode: response.roomCode }
      } else {
        console.log('🔍 createGame - API call failed:', response)
        throw new Error('Failed to create game')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create game'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const joinGameByRoomCode = useCallback(async (roomCode: string, playerAddress: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 joinGameByRoomCode - Starting API call:', { roomCode, playerAddress })
      const response = await apiService.joinGameByRoomCode({ roomCode, playerAddress })
      console.log('🔍 joinGameByRoomCode - API response:', response)

      if (response.success) {
        console.log('🔍 joinGameByRoomCode - Setting game:', response.game)
        setGame(response.game)

        // Set the game ID for tracking
        setCurrentGameId(response.game.gameId)
        console.log('🔍 joinGameByRoomCode - Set currentGameId:', response.game.gameId)

        // Convert players first
        const convertedPlayers = convertPlayers(response.game, playerAddress)
        setPlayers(convertedPlayers)

        // Set current player with name/avatar/role from converted players
        const currentPlayerFromConverted = convertedPlayers.find(p => p.address === playerAddress)
        console.log('🔍 joinGameByRoomCode - currentPlayerFromConverted:', currentPlayerFromConverted)
        console.log('🔍 joinGameByRoomCode - game roles:', response.game.roles)

        if (currentPlayerFromConverted) {
          setCurrentPlayer({
            id: playerAddress,
            name: currentPlayerFromConverted.name, // Use name from convertedPlayers (based on index)
            avatar: currentPlayerFromConverted.avatar, // Use avatar from convertedPlayers
            isAlive: true,
            isCurrentPlayer: true,
            address: playerAddress,
            role: currentPlayerFromConverted.role
          })

          console.log('🔍 joinGameByRoomCode - Final state:', {
            game: response.game,
            currentPlayer: {
              id: playerAddress,
              name: currentPlayerFromConverted.name,
              address: playerAddress,
              role: currentPlayerFromConverted.role
            },
            players: convertedPlayers
          })
        } else {
          console.error('❌ Could not find current player in converted players')
        }
      } else {
        throw new Error('Failed to join game')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [convertPlayers])

  const joinGame = useCallback(async (gameId: string, playerAddress: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.joinGame(gameId, { playerAddress })

      if (response.success) {
        setGame(response.game)

        // Convert players first
        const convertedPlayers = convertPlayers(response.game, playerAddress)
        setPlayers(convertedPlayers)

        // Set current player with name/avatar/role from converted players
        const currentPlayerFromConverted = convertedPlayers.find(p => p.address === playerAddress)
        if (currentPlayerFromConverted) {
          setCurrentPlayer({
            id: playerAddress,
            name: currentPlayerFromConverted.name, // Use name from convertedPlayers (based on index)
            avatar: currentPlayerFromConverted.avatar, // Use avatar from convertedPlayers
            isAlive: true,
            isCurrentPlayer: true,
            address: playerAddress,
            role: currentPlayerFromConverted.role
          })
        } else {
          console.error('❌ Could not find current player in converted players')
        }
      } else {
        throw new Error('Failed to join game')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [convertPlayers])

  const submitNightAction = useCallback(async (action: any, commit?: string): Promise<void> => {
    if (!game || !currentPlayer?.address) {
      throw new Error('No active game or player')
    }

    try {
      const actionData: GameAction = {
        playerAddress: currentPlayer.address,
        action,
        commit
      }

      console.log('🚀 Submitting night action:', actionData)
      console.log('📡 Sending via Socket.IO...')

      // Send via Socket.IO for real-time updates
      submitAction({
        gameId: game.gameId,
        ...actionData
      })

      console.log('📡 Socket.IO action sent, now sending via REST API...')

      // Also send via REST API as backup
      await apiService.submitNightAction(game.gameId, actionData)

      console.log('✅ Night action submitted successfully via both Socket.IO and REST API')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit action'
      console.error('❌ Failed to submit night action:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [game, currentPlayer?.address, submitAction])



  const submitTaskAnswer = useCallback(async (answer: any): Promise<void> => {
    if (!game || !currentPlayer?.address) {
      throw new Error('No active game or player')
    }

    try {
      const taskData: TaskSubmission = {
        playerAddress: currentPlayer.address,
        answer
      }

      // Send via Socket.IO for real-time updates
      submitTask({
        gameId: game.gameId,
        ...taskData
      })

      // Also send via REST API as backup
      await apiService.submitTaskAnswer(game.gameId, taskData)

      // Note: Task result announcements will be sent by the backend
      // when task results are evaluated, not immediately on submission
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit task answer'
      setError(errorMessage)
      throw err
    }
  }, [game, currentPlayer?.address, submitTask])

  const submitVote = useCallback(async (vote: string): Promise<void> => {
    if (!game || !currentPlayer?.address) {
      throw new Error('No active game or player')
    }

    try {
      const voteData: VoteSubmission = {
        playerAddress: currentPlayer.address,
        vote
      }

      // Send via Socket.IO for real-time updates
      socketSubmitVote({
        gameId: game.gameId,
        ...voteData
      })

      // Also send via REST API as backup
      await apiService.submitVote(game.gameId, voteData)

      soundService.playVote();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit vote'
      setError(errorMessage)
      throw err
    }
  }, [game, currentPlayer?.address, socketSubmitVote])

  const eliminatePlayer = useCallback(async (playerAddress: string): Promise<void> => {
    if (!game) {
      throw new Error('No active game')
    }

    try {
      await apiService.eliminatePlayer(game.gameId, playerAddress)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to eliminate player'
      setError(errorMessage)
      throw err
    }
  }, [game])

  const setCurrentPlayerFromAddress = useCallback((address: string) => {
    // Use temporary placeholder values - will be updated when game state arrives
    // This is only called on initial wallet connection before joining a game
    const player: Player = {
      id: address,
      name: 'Loading...', // Placeholder - will be updated from game state
      avatar: generateAvatar(0), // Temporary avatar - will be updated from game state
      isAlive: true,
      isCurrentPlayer: true,
      address: address
    }
    setCurrentPlayer(player)
    console.log('🔧 setCurrentPlayerFromAddress (temp):', player)
  }, [])

  const refreshGame = useCallback(async (): Promise<void> => {
    if (!currentGameId) return

    console.log('🔄 refreshGame called for gameId:', currentGameId)
    // Don't set loading state for background refreshes
    setError(null)

    try {
      const response = await apiService.getGame(currentGameId, currentPlayer?.address)
      console.log('🔄 refreshGame API response:', response)

      if (response.success) {
        setGame(response.game)

        if (response.game && currentPlayer?.address) {
          console.log('🔄 refreshGame - converting players for address:', currentPlayer.address)
          const convertedPlayers = convertPlayers(response.game, currentPlayer.address)
          setPlayers(convertedPlayers)

          // Update current player from converted players
          const currentPlayerFromConverted = convertedPlayers.find(p => p.address === currentPlayer.address)
          console.log('🔄 refreshGame - currentPlayerFromConverted:', currentPlayerFromConverted)

          if (currentPlayerFromConverted && currentPlayerFromConverted.role) {
            console.log(`[refreshGame] Updating current player: ${currentPlayerFromConverted.name} (${currentPlayerFromConverted.role})`)
            setCurrentPlayer(prev => prev ? {
              ...prev,
              role: currentPlayerFromConverted.role,
              name: currentPlayerFromConverted.name, // Update name from game state
              avatar: currentPlayerFromConverted.avatar // Update avatar from game state
            } : null)
          } else {
            console.log('🔄 refreshGame - No role found for current player:', currentPlayerFromConverted)
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh game'
      console.log('🔄 refreshGame error:', errorMessage)

      // If game not found, clear session instead of showing error
      if (errorMessage.toLowerCase().includes('not found') ||
        errorMessage.toLowerCase().includes('game not found') ||
        errorMessage.toLowerCase().includes('invalid game')) {
        console.log('🧹 Game not found - clearing session')
        resetGame()
        return
      }

      setError(errorMessage)
    }
    // Don't set loading state for background refreshes
  }, [currentGameId, currentPlayer?.address, convertPlayers, resetGame])



  return {
    game,
    currentPlayer,
    players,
    isLoading,
    error,
    isConnected,
    currentGameId,
    createGame,
    joinGame,
    joinGameByRoomCode,
    submitNightAction,
    submitTaskAnswer,
    submitVote,
    eliminatePlayer,
    refreshGame,
    setCurrentGameId,
    setCurrentPlayerFromAddress,
    resetGame
  }
}
