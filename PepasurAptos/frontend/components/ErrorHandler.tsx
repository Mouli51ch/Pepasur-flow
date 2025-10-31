"use client"

import { useState, useEffect } from 'react'
import { ConnectionError, ApiError, ErrorHandlerProps } from '@/types/errors'
import { formatErrorMessage, getActionableSuggestion } from '@/utils/errorHandling'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Wifi, WifiOff, RefreshCw, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ErrorHandlerComponentProps extends ErrorHandlerProps {
  mode?: 'toast' | 'modal' | 'inline'
  autoHide?: boolean
  autoHideDelay?: number
}

export function ErrorHandler({ 
  error, 
  onRetry, 
  onDismiss, 
  showProgress = false,
  mode = 'toast',
  autoHide = true,
  autoHideDelay = 5000 
}: ErrorHandlerComponentProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (error) {
      setIsVisible(true)
      
      if (mode === 'toast') {
        showErrorToast(error, onRetry)
      }
      
      if (autoHide && mode !== 'modal') {
        const timer = setTimeout(() => {
          handleDismiss()
        }, autoHideDelay)
        
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [error, mode, autoHide, autoHideDelay, onRetry])

  useEffect(() => {
    if (showProgress && isVisible) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 2
        })
      }, 100)
      
      return () => clearInterval(interval)
    }
  }, [showProgress, isVisible])

  const handleDismiss = () => {
    setIsVisible(false)
    setProgress(0)
    onDismiss?.()
  }

  const handleRetry = () => {
    setProgress(0)
    onRetry?.()
  }

  const showErrorToast = (error: ConnectionError | ApiError, retryFn?: () => void) => {
    const message = formatErrorMessage(error)
    const suggestion = getActionableSuggestion(error)
    
    toast({
      title: getErrorTitle(error),
      description: `${message} ${suggestion}`,
      variant: "destructive",
      duration: error.retryable ? 8000 : 5000,
      action: error.retryable && retryFn ? (
        <Button
          variant="outline"
          size="sm"
          onClick={retryFn}
          className="ml-2"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      ) : undefined,
    })
  }

  const getErrorTitle = (error: ConnectionError | ApiError): string => {
    switch (error.type) {
      case 'network':
        return 'Connection Error'
      case 'server':
        return 'Server Error'
      case 'timeout':
        return 'Request Timeout'
      case 'configuration':
        return 'Configuration Error'
      case 'validation':
        return 'Invalid Request'
      default:
        return 'Error'
    }
  }

  const getErrorIcon = (error: ConnectionError | ApiError) => {
    switch (error.type) {
      case 'network':
        return <WifiOff className="h-4 w-4" />
      case 'server':
        return <AlertTriangle className="h-4 w-4" />
      case 'timeout':
        return <Wifi className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  if (!error || !isVisible) return null

  const message = formatErrorMessage(error)
  const suggestion = getActionableSuggestion(error)
  const title = getErrorTitle(error)
  const icon = getErrorIcon(error)

  // Modal mode for critical errors
  if (mode === 'modal') {
    return (
      <Dialog open={isVisible} onOpenChange={handleDismiss}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>{message}</p>
              <p className="text-sm text-muted-foreground">{suggestion}</p>
            </DialogDescription>
          </DialogHeader>
          
          {showProgress && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Retrying...</div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleDismiss}>
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
            {error.retryable && onRetry && (
              <Button onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Inline mode for embedded error display
  if (mode === 'inline') {
    return (
      <Alert variant="destructive" className="mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            {icon}
            <div className="space-y-1">
              <AlertTitle>{title}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{message}</p>
                <p className="text-sm">{suggestion}</p>
              </AlertDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {error.retryable && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={showProgress}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${showProgress ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {showProgress && (
          <div className="mt-3 space-y-2">
            <div className="text-sm text-muted-foreground">Retrying...</div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
      </Alert>
    )
  }

  // Toast mode is handled in useEffect
  return null
}

// Hook for easy error handling
export function useErrorHandler() {
  const [error, setError] = useState<ConnectionError | ApiError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const showError = (error: ConnectionError | ApiError, mode: 'toast' | 'modal' | 'inline' = 'toast') => {
    setError(error)
  }

  const clearError = () => {
    setError(null)
    setIsRetrying(false)
  }

  const retry = (retryFn: () => Promise<void> | void) => {
    setIsRetrying(true)
    
    const result = retryFn()
    
    if (result instanceof Promise) {
      result
        .then(() => {
          clearError()
        })
        .catch((newError) => {
          setError(newError)
        })
        .finally(() => {
          setIsRetrying(false)
        })
    } else {
      setIsRetrying(false)
      clearError()
    }
  }

  return {
    error,
    isRetrying,
    showError,
    clearError,
    retry
  }
}

export default ErrorHandler