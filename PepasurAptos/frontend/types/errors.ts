// Core error handling types for connection error handling

export interface ConnectionError {
  type: 'network' | 'server' | 'timeout' | 'configuration'
  message: string
  timestamp: Date
  retryable: boolean
}

export interface ApiError {
  type: 'network' | 'server' | 'timeout' | 'validation'
  message: string
  statusCode?: number
  retryable: boolean
}

export interface ConnectionStats {
  totalAttempts: number
  successfulConnections: number
  lastConnectedAt: Date | null
  averageConnectionTime: number
}

export interface ConnectionState {
  socket: {
    status: 'connected' | 'connecting' | 'disconnected' | 'error'
    lastError: ConnectionError | null
    reconnectAttempts: number
    nextRetryAt: Date | null
  }
  api: {
    pendingRequests: number
    lastError: ApiError | null
    environmentValid: boolean
  }
  ui: {
    showErrorModal: boolean
    showRetryButton: boolean
    progressMessage: string | null
  }
}

export interface ErrorLogEntry {
  id: string
  timestamp: Date
  type: 'socket' | 'api'
  error: ConnectionError | ApiError
  context: {
    url?: string
    userAgent: string
    networkType?: string
    retryAttempt?: number
  }
  resolved: boolean
  resolvedAt?: Date
}

export interface ApiServiceConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ErrorHandlerProps {
  error: ConnectionError | ApiError | null
  onRetry?: () => void
  onDismiss?: () => void
  showProgress?: boolean
}

// Enhanced SocketContext types
export interface EnhancedSocketContextType {
  socket: any | null
  isConnected: boolean
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  lastError: ConnectionError | null
  connectionStats: ConnectionStats
  connect: () => void
  disconnect: () => void
  retryConnection: () => void
  joinGame: (gameId: string, playerAddress: string) => void
  submitAction: (data: any) => void
  submitTask: (data: any) => void
  submitVote: (data: any) => void
  sendChatMessage: (data: any) => void
}