"use client"

import { useState } from 'react'
import { useEnhancedSocket } from '@/contexts/EnhancedSocketContext'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Clock } from 'lucide-react'
import { formatErrorMessage, getActionableSuggestion } from '@/utils/errorHandling'

interface ConnectionStatusIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  showDetails?: boolean
  className?: string
}

export function ConnectionStatusIndicator({ 
  position = 'top-right', 
  showDetails = false,
  className = '' 
}: ConnectionStatusIndicatorProps) {
  const { 
    isConnected, 
    connectionStatus, 
    lastError, 
    connectionStats, 
    retryConnection 
  } = useEnhancedSocket()
  
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await retryConnection()
    } finally {
      // Reset after a delay to show the retry action
      setTimeout(() => setIsRetrying(false), 2000)
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500'
      case 'disconnected':
        return 'bg-gray-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = () => {
    if (isRetrying) {
      return <RefreshCw className="h-3 w-3 animate-spin" />
    }
    
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3" />
      case 'connecting':
        return <RefreshCw className="h-3 w-3 animate-spin" />
      case 'disconnected':
        return <WifiOff className="h-3 w-3" />
      case 'error':
        return <AlertTriangle className="h-3 w-3" />
      default:
        return <WifiOff className="h-3 w-3" />
    }
  }

  const getStatusText = () => {
    if (isRetrying) return 'Retrying...'
    
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return 'Connection Error'
      default:
        return 'Unknown'
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }

  const getTooltipContent = () => {
    const content = []
    
    // Connection status
    content.push(`Status: ${getStatusText()}`)
    
    // Connection stats
    if (connectionStats.totalAttempts > 0) {
      content.push(`Attempts: ${connectionStats.totalAttempts}`)
      content.push(`Successful: ${connectionStats.successfulConnections}`)
    }
    
    if (connectionStats.lastConnectedAt) {
      const lastConnected = new Date(connectionStats.lastConnectedAt).toLocaleTimeString()
      content.push(`Last connected: ${lastConnected}`)
    }
    
    if (connectionStats.averageConnectionTime > 0) {
      const avgTime = Math.round(connectionStats.averageConnectionTime / 1000 * 100) / 100
      content.push(`Avg connection time: ${avgTime}s`)
    }
    
    // Error information
    if (lastError) {
      content.push('')
      content.push(`Error: ${formatErrorMessage(lastError)}`)
      content.push(`Suggestion: ${getActionableSuggestion(lastError)}`)
    }
    
    return content.join('\n')
  }

  // Compact indicator (default)
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={connectionStatus === 'error' ? handleRetry : undefined}
              className={`fixed ${getPositionClasses()} z-50 p-2 h-8 w-8 ${className}`}
              disabled={isRetrying || connectionStatus === 'connecting'}
            >
              <div className={`absolute inset-0 rounded-full ${getStatusColor()} opacity-20`} />
              {getStatusIcon()}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <pre className="text-xs whitespace-pre-wrap">{getTooltipContent()}</pre>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Detailed indicator
  return (
    <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
      <Badge 
        variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
        className="flex items-center gap-2 px-3 py-1"
      >
        {getStatusIcon()}
        <span className="text-xs font-mono">{getStatusText()}</span>
        {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="h-4 w-4 p-0 ml-1"
          >
            <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </Badge>
      
      {lastError && connectionStatus === 'error' && (
        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs max-w-xs">
          <div className="font-semibold text-red-400">Connection Error</div>
          <div className="text-red-300 mt-1">{formatErrorMessage(lastError)}</div>
          <div className="text-red-200 mt-1 text-xs">{getActionableSuggestion(lastError)}</div>
        </div>
      )}
    </div>
  )
}

// Hook for programmatic access to connection status
export function useConnectionStatus() {
  const { 
    isConnected, 
    connectionStatus, 
    lastError, 
    connectionStats, 
    retryConnection 
  } = useEnhancedSocket()

  const isHealthy = isConnected && connectionStatus === 'connected'
  const hasError = connectionStatus === 'error' && lastError !== null
  const isRetryable = lastError?.retryable ?? false

  return {
    isConnected,
    connectionStatus,
    lastError,
    connectionStats,
    isHealthy,
    hasError,
    isRetryable,
    retryConnection
  }
}

export default ConnectionStatusIndicator