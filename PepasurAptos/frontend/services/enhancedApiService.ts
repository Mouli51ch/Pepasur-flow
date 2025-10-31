import { ApiServiceConfig, ApiResponse, ApiError } from '@/types/errors'
import { categorizeApiError, validateEnvironment, createErrorLogEntry, addErrorLog, calculateBackoffDelay } from '@/utils/errorHandling'

class EnhancedApiService {
  private config: ApiServiceConfig
  private pendingRequests = new Map<string, AbortController>()
  private requestCount = 0

  constructor(config?: Partial<ApiServiceConfig>) {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      timeout: 15000, // 15 seconds (increased to accommodate blockchain confirmation time)
      retryAttempts: 3,
      retryDelay: 1000, // 1 second base delay
      ...config
    }
  }

  // Environment validation
  public validateEnvironment(): { valid: boolean; errors: string[] } {
    return validateEnvironment()
  }

  // Get pending request count for loading indicators
  public getPendingRequestCount(): number {
    return this.pendingRequests.size
  }

  // Main request method with comprehensive error handling
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt = 0
  ): Promise<ApiResponse<T>> {
    const requestId = `req_${++this.requestCount}_${Date.now()}`
    const url = `${this.config.baseUrl}${endpoint}`
    
    // Validate environment before making request
    const envValidation = this.validateEnvironment()
    if (!envValidation.valid) {
      const error = categorizeApiError(
        new Error(`Configuration error: ${envValidation.errors.join(', ')}`),
        undefined
      )
      
      // Log the error
      addErrorLog(createErrorLogEntry('api', error, { url }))
      
      return {
        success: false,
        error
      }
    }

    // Create abort controller for timeout and cancellation
    const controller = new AbortController()
    this.pendingRequests.set(requestId, controller)

    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, this.config.timeout)

    try {
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      }

      console.log(`🌐 API Request [${requestId}]:`, {
        method: config.method || 'GET',
        url,
        attempt: attempt + 1,
        maxAttempts: this.config.retryAttempts
      })

      const response = await fetch(url, config)
      
      // Clear timeout and remove from pending requests
      clearTimeout(timeoutId)
      this.pendingRequests.delete(requestId)

      console.log(`✅ API Response [${requestId}]:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
        const error = categorizeApiError(
          new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`),
          response.status
        )

        // Log the error
        addErrorLog(createErrorLogEntry('api', error, { 
          url, 
          retryAttempt: attempt + 1 
        }))

        // Retry logic for retryable errors
        if (error.retryable && attempt < this.config.retryAttempts - 1) {
          const delay = calculateBackoffDelay(attempt, this.config.retryDelay)
          console.log(`🔄 Retrying API request [${requestId}] in ${delay}ms (attempt ${attempt + 2}/${this.config.retryAttempts})`)
          
          await new Promise(resolve => setTimeout(resolve, delay))
          return this.request<T>(endpoint, options, attempt + 1)
        }

        return {
          success: false,
          error
        }
      }

      const data = await response.json()
      console.log(`📦 API Data [${requestId}]:`, data)

      return {
        success: true,
        data
      }

    } catch (error: any) {
      // Clear timeout and remove from pending requests
      clearTimeout(timeoutId)
      this.pendingRequests.delete(requestId)

      console.error(`❌ API Error [${requestId}]:`, error)

      const apiError = categorizeApiError(error)
      
      // Log the error
      addErrorLog(createErrorLogEntry('api', apiError, { 
        url, 
        retryAttempt: attempt + 1 
      }))

      // Retry logic for retryable errors
      if (apiError.retryable && attempt < this.config.retryAttempts - 1) {
        const delay = calculateBackoffDelay(attempt, this.config.retryDelay)
        console.log(`🔄 Retrying API request [${requestId}] in ${delay}ms (attempt ${attempt + 2}/${this.config.retryAttempts})`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.request<T>(endpoint, options, attempt + 1)
      }

      return {
        success: false,
        error: apiError
      }
    }
  }

  // Request deduplication helper
  private getRequestKey(endpoint: string, options: RequestInit): string {
    const method = options.method || 'GET'
    const body = options.body || ''
    return `${method}:${endpoint}:${body}`
  }

  // Public API methods with enhanced error handling

  // Game Management
  async createGame(data: {
    creatorAddress: string
    stakeAmount: string
    minPlayers: number
    isPublic: boolean
    transactionHash: string
  }): Promise<ApiResponse<{
    success: boolean
    gameId: string
    roomCode: string
    message: string
  }>> {
    return this.request('/api/game/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async recordStake(data: {
    gameId: string
    playerAddress: string
    transactionHash: string
  }): Promise<ApiResponse<{
    success: boolean
    message: string
  }>> {
    return this.request('/api/game/record-stake', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getGameByRoomCode(roomCode: string): Promise<ApiResponse<{
    success: boolean
    game: any
  }>> {
    return this.request(`/api/game/room/${roomCode}`)
  }

  async getGame(gameId: string, playerAddress?: string): Promise<ApiResponse<{
    success: boolean
    game: any
  }>> {
    const url = playerAddress
      ? `/api/game/${gameId}?playerAddress=${encodeURIComponent(playerAddress)}`
      : `/api/game/${gameId}`

    return this.request(url)
  }

  async joinGameByRoomCode(data: {
    roomCode: string
    playerAddress: string
  }): Promise<ApiResponse<{
    success: boolean
    game: any
    message: string
  }>> {
    return this.request('/api/game/join-by-code', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async joinGame(gameId: string, data: {
    playerAddress: string
  }): Promise<ApiResponse<{
    success: boolean
    game: any
    message: string
  }>> {
    return this.request(`/api/game/${gameId}/player/join`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPublicGames(): Promise<ApiResponse<{
    success: boolean
    games: Array<{
      gameId: string
      creator: string
      players: number
      maxPlayers: number
      stakeAmount: string
      phase: string
      day: number
      startedAt: number | null
      roomCode: string
    }>
  }>> {
    return this.request('/api/game/public')
  }

  async getActiveGames(): Promise<ApiResponse<{
    success: boolean
    games: Array<{
      gameId: string
      creator: string
      players: number
      maxPlayers: number
      stakeAmount: string
      phase: string
      day: number
      startedAt: number | null
    }>
  }>> {
    return this.request('/api/game')
  }

  // Game Actions
  async submitNightAction(gameId: string, data: {
    playerAddress: string
    action: any
    commit?: string
  }): Promise<ApiResponse<{
    success: boolean
    message: string
  }>> {
    return this.request(`/api/game/${gameId}/action/night`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async submitTaskAnswer(gameId: string, data: {
    playerAddress: string
    answer: any
  }): Promise<ApiResponse<{
    success: boolean
    correct: boolean
    message: string
  }>> {
    return this.request(`/api/game/${gameId}/task/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async submitVote(gameId: string, data: {
    playerAddress: string
    vote: string
  }): Promise<ApiResponse<{
    success: boolean
    message: string
  }>> {
    return this.request(`/api/game/${gameId}/vote/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async signalReady(gameId: string, playerAddress: string): Promise<ApiResponse<{
    success: boolean
    message: string
  }>> {
    return this.request(`/api/game/${gameId}/ready`, {
      method: 'POST',
      body: JSON.stringify({ playerAddress }),
    })
  }

  // Game Management - Additional endpoints
  async toggleGameVisibility(gameId: string, creatorAddress: string): Promise<ApiResponse<{
    success: boolean
    isPublic: boolean
    message: string
  }>> {
    return this.request(`/api/game/${gameId}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ creatorAddress }),
    })
  }

  async leaveGame(gameId: string, playerAddress: string): Promise<ApiResponse<{
    success: boolean
    message: string
  }>> {
    return this.request('/api/game/leave', {
      method: 'POST',
      body: JSON.stringify({ gameId, playerAddress }),
    })
  }

  async getPublicLobbies(): Promise<ApiResponse<{
    success: boolean
    lobbies: Array<{
      gameId: string
      roomCode: string
      creator: string
      players: number
      maxPlayers: number
      stakeAmount: string
      phase: string
      isPublic: boolean
    }>
  }>> {
    return this.request('/api/game/public/lobbies')
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{
    status: string
    timestamp: string
  }>> {
    return this.request('/api/health')
  }

  // Cancel all pending requests
  public cancelAllRequests(): void {
    this.pendingRequests.forEach((controller) => {
      controller.abort()
    })
    this.pendingRequests.clear()
  }

  // Cancel specific request
  public cancelRequest(requestId: string): void {
    const controller = this.pendingRequests.get(requestId)
    if (controller) {
      controller.abort()
      this.pendingRequests.delete(requestId)
    }
  }
}

// Create singleton instance
export const enhancedApiService = new EnhancedApiService()
export default enhancedApiService