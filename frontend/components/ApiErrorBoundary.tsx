"use client"

import { useState, useEffect, ReactNode } from 'react'
import { ApiError } from '@/types/errors'
import { categorizeApiError } from '@/utils/errorHandling'
import ErrorHandler from './ErrorHandler'

interface ApiErrorBoundaryProps {
  children: ReactNode
  onError?: (error: ApiError) => void
  fallback?: (error: ApiError, retry: () => void) => ReactNode
}

export function ApiErrorBoundary({ children, onError, fallback }: ApiErrorBoundaryProps) {
  const [error, setError] = useState<ApiError | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const handleError = (error: any) => {
    const apiError = categorizeApiError(error)
    setError(apiError)
    onError?.(apiError)
  }

  const retry = () => {
    setError(null)
    setRetryKey(prev => prev + 1)
  }

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === 'object' && event.reason.message) {
        handleError(event.reason)
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }, [])

  if (error) {
    if (fallback) {
      return <>{fallback(error, retry)}</>
    }

    return (
      <ErrorHandler
        error={error}
        onRetry={error.retryable ? retry : undefined}
        onDismiss={() => setError(null)}
        mode="inline"
      />
    )
  }

  return <div key={retryKey}>{children}</div>
}

// Hook for handling API errors in components
export function useApiErrorHandler() {
  const [error, setError] = useState<ApiError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleApiCall = async <T,>(
    apiCall: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: ApiError) => void
  ): Promise<T | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await apiCall()
      onSuccess?.(result)
      return result
    } catch (err: any) {
      const apiError = categorizeApiError(err)
      setError(apiError)
      onError?.(apiError)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const clearError = () => setError(null)

  const retry = async <T,>(
    apiCall: () => Promise<T>,
    onSuccess?: (result: T) => void
  ): Promise<T | null> => {
    return handleApiCall(apiCall, onSuccess)
  }

  return {
    error,
    isLoading,
    handleApiCall,
    clearError,
    retry
  }
}

export default ApiErrorBoundary