"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { ConnectionError, ConnectionStats, EnhancedSocketContextType } from '@/types/errors'
import { categorizeSocketError, calculateBackoffDelay, createErrorLogEntry, addErrorLog, markErrorResolved } from '@/utils/errorHandling'

const EnhancedSocketContext = createContext<EnhancedSocketContextType | undefined>(undefined)

interface EnhancedSocketProviderProps {
  children: ReactNode
}

export function EnhancedSocketProvider({ children }: EnhancedSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected')
  const [lastError, setLastError] = useState<ConnectionError | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [nextRetryAt, setNextRetryAt] = useState<Date | null>(null)
  const [joinedGames, setJoinedGames] = useState<Set<string>>(new Set())
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    totalAttempts: 0,
    successfulConnections: 0,
    lastConnectedAt: null,
    averageConnectionTime: 0
  })
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null)

  const updateConnectionStats = useCallback((connected: boolean) => {
    setConnectionStats(prev => {
      const newStats = { ...prev }
      
      if (connected) {
        newStats.successfulConnections += 1
        newStats.lastConnectedAt = new Date()
        
        if (connectionStartTime) {
          const connectionTime = Date.now() - connectionStartTime.getTime()
          newStats.averageConnectionTime = 
            (prev.averageConnectionTime * (prev.successfulConnections - 1) + connectionTime) / prev.successfulConnections
        }
      }
      
      return newStats
    })
  }, [connectionStartTime])

  const connect = useCallback(() => {
    if (socket?.connected) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    console.log('🔌 Enhanced Socket: Attempting to connect to:', socketUrl)
    
    setConnectionStatus('connecting')
    setConnectionStartTime(new Date())
    setConnectionStats(prev => ({ ...prev, totalAttempts: prev.totalAttempts + 1 }))
    
    const newSocket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      timeout: 30000,
      forceNew: true,
      reconnection: false, // We'll handle reconnection manually
      withCredentials: false,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: false
    })

    newSocket.on('connect', () => {
      console.log('🔌 Enhanced Socket: Connected to server:', newSocket.id)
      setIsConnected(true)
      setConnectionStatus('connected')
      setReconnectAttempts(0)
      setLastError(null)
      setNextRetryAt(null)
      updateConnectionStats(true)
      
      // Mark any previous errors as resolved
      if (lastError) {
        markErrorResolved(lastError.timestamp.getTime().toString())
      }
    })

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Enhanced Socket: Disconnected from server:', reason)
      setIsConnected(false)
      setConnectionStatus('disconnected')
      
      // Categorize disconnect reason
      const error = categorizeSocketError({ message: `Disconnected: ${reason}`, type: 'disconnect' })
      setLastError(error)
      addErrorLog(createErrorLogEntry('socket', error, { url: socketUrl }))
    })

    newSocket.on('connect_error', (error) => {
      console.error('🔌 Enhanced Socket: Connection error:', error)
      
      const categorizedError = categorizeSocketError(error)
      setLastError(categorizedError)
      setIsConnected(false)
      setConnectionStatus('error')
      setReconnectAttempts(prev => prev + 1)
      
      // Log the error
      addErrorLog(createErrorLogEntry('socket', categorizedError, { 
        url: socketUrl,
        retryAttempt: reconnectAttempts + 1
      }))
      
      console.error('🔌 Enhanced Socket: Error details:', {
        type: categorizedError.type,
        message: categorizedError.message,
        retryable: categorizedError.retryable,
        attempt: reconnectAttempts + 1
      })
    })

    newSocket.on('error', (error) => {
      console.error('🔌 Enhanced Socket: General error:', error)
      const categorizedError = categorizeSocketError(error)
      setLastError(categorizedError)
      addErrorLog(createErrorLogEntry('socket', categorizedError, { url: socketUrl }))
    })

    setSocket(newSocket)
  }, [socket, lastError, reconnectAttempts, updateConnectionStats])

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
      setConnectionStatus('disconnected')
      setReconnectAttempts(0)
      setNextRetryAt(null)
    }
  }, [socket])

  const retryConnection = useCallback(() => {
    console.log('🔌 Enhanced Socket: Manual retry requested')
    setReconnectAttempts(0)
    setNextRetryAt(null)
    setLastError(null)
    disconnect()
    setTimeout(connect, 1000)
  }, [connect, disconnect])

  // Exponential backoff reconnection logic
  useEffect(() => {
    if (!isConnected && connectionStatus === 'error' && reconnectAttempts < 5) {
      const delay = calculateBackoffDelay(reconnectAttempts)
      const retryTime = new Date(Date.now() + delay)
      setNextRetryAt(retryTime)
      
      console.log(`🔌 Enhanced Socket: Scheduling reconnection attempt ${reconnectAttempts + 1}/5 in ${delay}ms`)
      
      const timer = setTimeout(() => {
        console.log(`🔌 Enhanced Socket: Attempting reconnection ${reconnectAttempts + 1}/5`)
        connect()
      }, delay)
      
      return () => clearTimeout(timer)
    } else if (reconnectAttempts >= 5) {
      console.error('🔌 Enhanced Socket: Maximum reconnection attempts reached')
      setConnectionStatus('error')
      setNextRetryAt(null)
    }
  }, [isConnected, connectionStatus, reconnectAttempts, connect])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [])

  const joinGame = useCallback((gameId: string, playerAddress: string) => {
    if (socket && isConnected) {
      const joinKey = `${gameId}-${playerAddress}`
      if (!joinedGames.has(joinKey)) {
        console.log('🎮 Enhanced Socket: Joining game:', { gameId, playerAddress })
        socket.emit('join_game', { gameId, playerAddress })
        setJoinedGames(prev => new Set(prev).add(joinKey))
      } else {
        console.log('🎮 Enhanced Socket: Already joined game, skipping:', { gameId, playerAddress })
      }
    } else {
      console.error('🎮 Enhanced Socket: Cannot join game - not connected')
      const error = categorizeSocketError({ 
        message: 'Cannot join game: Socket not connected',
        type: 'NotConnected'
      })
      setLastError(error)
    }
  }, [socket, isConnected, joinedGames])

  const submitAction = useCallback((data: any) => {
    if (socket && isConnected) {
      console.log('🎮 Enhanced Socket: Submitting action:', data)
      socket.emit('submit_action', data)
    } else {
      console.error('🎮 Enhanced Socket: Cannot submit action - not connected')
    }
  }, [socket, isConnected])

  const submitTask = useCallback((data: any) => {
    if (socket && isConnected) {
      console.log('🎮 Enhanced Socket: Submitting task:', data)
      socket.emit('submit_task', data)
    } else {
      console.error('🎮 Enhanced Socket: Cannot submit task - not connected')
    }
  }, [socket, isConnected])

  const submitVote = useCallback((data: any) => {
    if (socket && isConnected) {
      console.log('🎮 Enhanced Socket: Submitting vote:', data)
      socket.emit('submit_vote', data)
    } else {
      console.error('🎮 Enhanced Socket: Cannot submit vote - not connected')
    }
  }, [socket, isConnected])

  const sendChatMessage = useCallback((data: any) => {
    if (socket && isConnected) {
      console.log('🎮 Enhanced Socket: Sending chat message:', data)
      socket.emit('chat_message', data)
    } else {
      console.error('🎮 Enhanced Socket: Cannot send chat message - not connected')
    }
  }, [socket, isConnected])

  const value: EnhancedSocketContextType = {
    socket,
    isConnected,
    connectionStatus,
    lastError,
    connectionStats,
    connect,
    disconnect,
    retryConnection,
    joinGame,
    submitAction,
    submitTask,
    submitVote,
    sendChatMessage
  }

  return (
    <EnhancedSocketContext.Provider value={value}>
      {children}
    </EnhancedSocketContext.Provider>
  )
}

export function useEnhancedSocket() {
  const context = useContext(EnhancedSocketContext)
  if (context === undefined) {
    throw new Error('useEnhancedSocket must be used within an EnhancedSocketProvider')
  }
  return context
}

// Backward compatibility hook
export function useSocket() {
  const enhancedContext = useContext(EnhancedSocketContext)
  if (enhancedContext) {
    // Return compatible interface
    return {
      socket: enhancedContext.socket,
      isConnected: enhancedContext.isConnected,
      connect: enhancedContext.connect,
      disconnect: enhancedContext.disconnect,
      joinGame: enhancedContext.joinGame,
      submitAction: enhancedContext.submitAction,
      submitTask: enhancedContext.submitTask,
      submitVote: enhancedContext.submitVote,
      sendChatMessage: enhancedContext.sendChatMessage
    }
  }
  
  throw new Error('useSocket must be used within an EnhancedSocketProvider')
}