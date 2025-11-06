import { ConnectionError, ApiError, ErrorLogEntry } from '@/types/errors'

// Error categorization functions
export function categorizeSocketError(error: any): ConnectionError {
  const timestamp = new Date()
  
  // Network errors
  if (error.type === 'TransportError' || error.message?.includes('xhr poll error')) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection.',
      timestamp,
      retryable: true
    }
  }
  
  // Server errors
  if (error.type === 'ServerError' || error.message?.includes('server')) {
    return {
      type: 'server',
      message: 'Server is temporarily unavailable. Please try again.',
      timestamp,
      retryable: true
    }
  }
  
  // Timeout errors
  if (error.type === 'TimeoutError' || error.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Connection timed out. Please try again.',
      timestamp,
      retryable: true
    }
  }
  
  // Configuration errors
  if (error.message?.includes('ENOTFOUND') || error.message?.includes('invalid URL')) {
    return {
      type: 'configuration',
      message: 'Unable to connect. Please check your network settings.',
      timestamp,
      retryable: false
    }
  }
  
  // Default to network error for unknown errors
  return {
    type: 'network',
    message: error.message || 'Connection failed. Please try again.',
    timestamp,
    retryable: true
  }
}

export function categorizeApiError(error: any, statusCode?: number): ApiError {
  // Network errors (fetch failures, CORS issues)
  if (error.name === 'TypeError' && error.message?.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network request failed. Please check your connection.',
      statusCode,
      retryable: true
    }
  }
  
  // Timeout errors
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Request timed out. Please try again.',
      statusCode,
      retryable: true
    }
  }
  
  // Server errors (5xx)
  if (statusCode && statusCode >= 500) {
    return {
      type: 'server',
      message: 'Server error. Please try again later.',
      statusCode,
      retryable: true
    }
  }
  
  // Client errors (4xx) - not retryable
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return {
      type: 'validation',
      message: getClientErrorMessage(statusCode),
      statusCode,
      retryable: false
    }
  }
  
  // Default to network error
  return {
    type: 'network',
    message: error.message || 'Request failed. Please try again.',
    statusCode,
    retryable: true
  }
}

function getClientErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input.'
    case 401:
      return 'Authentication required. Please connect your wallet.'
    case 403:
      return 'Access denied. You do not have permission.'
    case 404:
      return 'Resource not found. Please try again.'
    case 409:
      return 'Conflict detected. Please refresh and try again.'
    case 429:
      return 'Too many requests. Please wait and try again.'
    default:
      return 'Request failed. Please check your input and try again.'
  }
}

// Error message formatting and sanitization
export function formatErrorMessage(error: ConnectionError | ApiError): string {
  // Sanitize error messages to remove sensitive information
  let message = error.message
  
  // Remove URLs and IP addresses
  message = message.replace(/https?:\/\/[^\s]+/g, '[URL]')
  message = message.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
  
  // Remove potential tokens or keys
  message = message.replace(/[a-zA-Z0-9]{32,}/g, '[TOKEN]')
  
  return message
}

export function getActionableSuggestion(error: ConnectionError | ApiError): string {
  switch (error.type) {
    case 'network':
      return 'Check your internet connection and try again.'
    case 'server':
      return 'The server is temporarily unavailable. Please wait a moment and try again.'
    case 'timeout':
      return 'The request took too long. Please try again with a stable connection.'
    case 'configuration':
      return 'There may be a configuration issue. Please refresh the page or contact support.'
    case 'validation':
      return 'Please check your input and try again.'
    default:
      return 'Please try again or contact support if the problem persists.'
  }
}

// Exponential backoff calculation
export function calculateBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 attempts)
  const maxDelay = 16000 // 16 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay
  return Math.floor(delay + jitter)
}

// Error logging utilities
export function createErrorLogEntry(
  type: 'socket' | 'api',
  error: ConnectionError | ApiError,
  context: Partial<ErrorLogEntry['context']> = {}
): ErrorLogEntry {
  return {
    id: generateErrorId(),
    timestamp: new Date(),
    type,
    error,
    context: {
      userAgent: navigator.userAgent,
      networkType: getNetworkType(),
      ...context
    },
    resolved: false
  }
}

function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getNetworkType(): string {
  // @ts-ignore - navigator.connection is experimental
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  return connection?.effectiveType || 'unknown'
}

// Environment validation
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check required environment variables
  if (!process.env.NEXT_PUBLIC_API_URL) {
    errors.push('API URL not configured')
  }
  
  if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
    errors.push('Socket URL not configured')
  }
  
  // Validate URL format
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      new URL(process.env.NEXT_PUBLIC_API_URL)
    }
  } catch {
    errors.push('Invalid API URL format')
  }
  
  try {
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
      new URL(process.env.NEXT_PUBLIC_SOCKET_URL)
    }
  } catch {
    errors.push('Invalid Socket URL format')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Error log storage with rotation (max 100 entries)
const MAX_ERROR_LOGS = 100
let errorLogs: ErrorLogEntry[] = []

export function addErrorLog(entry: ErrorLogEntry): void {
  errorLogs.unshift(entry)
  
  // Rotate logs if exceeding max
  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs = errorLogs.slice(0, MAX_ERROR_LOGS)
  }
}

export function getErrorLogs(): ErrorLogEntry[] {
  return [...errorLogs]
}

export function markErrorResolved(errorId: string): void {
  const entry = errorLogs.find(log => log.id === errorId)
  if (entry) {
    entry.resolved = true
    entry.resolvedAt = new Date()
  }
}

export function clearErrorLogs(): void {
  errorLogs = []
}