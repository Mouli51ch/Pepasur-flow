import { BaseError, ContractFunctionRevertedError } from 'viem'

export interface ContractError {
  type: 'revert' | 'gas' | 'network' | 'unknown'
  message: string
  reason?: string
  data?: string
}

export function parseContractError(error: any): ContractError {
  console.error('🔍 Parsing contract error:', error)

  // Handle viem contract errors
  if (error instanceof BaseError) {
    const revertError = error.walk(err => err instanceof ContractFunctionRevertedError)
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName ?? ''
      const args = revertError.data?.args ?? []
      
      return {
        type: 'revert',
        message: `Contract reverted: ${errorName}`,
        reason: errorName,
        data: args.length > 0 ? JSON.stringify(args) : undefined
      }
    }
  }

  // Handle common error patterns
  const errorMessage = error?.message || error?.toString() || 'Unknown error'
  
  // Gas estimation failed
  if (errorMessage.includes('gas') || errorMessage.includes('Gas')) {
    return {
      type: 'gas',
      message: 'Transaction failed due to gas issues',
      reason: 'Insufficient gas or gas estimation failed'
    }
  }
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network error occurred',
      reason: 'Connection to blockchain failed'
    }
  }
  
  // Contract revert patterns
  if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
    // Try to extract revert reason
    const revertMatch = errorMessage.match(/execution reverted:?\s*(.+)/i)
    const reason = revertMatch?.[1] || 'Unknown revert reason'
    
    return {
      type: 'revert',
      message: `Contract execution reverted: ${reason}`,
      reason
    }
  }
  
  return {
    type: 'unknown',
    message: errorMessage,
    reason: 'Unhandled error type'
  }
}

export function getContractErrorSuggestion(error: ContractError): string {
  switch (error.type) {
    case 'revert':
      if (error.reason?.includes('GameNotActive') || error.reason?.includes('status')) {
        return 'The game may have already started or ended. Try refreshing and checking the game status.'
      }
      if (error.reason?.includes('AlreadyJoined') || error.reason?.includes('player')) {
        return 'You may have already joined this game. Check your player status.'
      }
      if (error.reason?.includes('InsufficientStake') || error.reason?.includes('stake')) {
        return 'The stake amount may be incorrect. Verify the required stake amount.'
      }
      if (error.reason?.includes('GameFull') || error.reason?.includes('capacity')) {
        return 'The game may be full. Try joining a different game.'
      }
      return 'The contract rejected the transaction. Check the game state and try again.'
    
    case 'gas':
      return 'Try increasing the gas limit or check if you have enough ETH/FLOW for gas fees.'
    
    case 'network':
      return 'Check your internet connection and try again.'
    
    default:
      return 'An unexpected error occurred. Please try again or contact support.'
  }
}

// Enhanced error logging for contract interactions
export function logContractError(
  operation: string,
  contractAddress: string,
  functionName: string,
  args: any[],
  error: ContractError
) {
  console.group(`🚨 Contract Error: ${operation}`)
  console.error('Contract:', contractAddress)
  console.error('Function:', functionName)
  console.error('Arguments:', args)
  console.error('Error Type:', error.type)
  console.error('Message:', error.message)
  if (error.reason) console.error('Reason:', error.reason)
  if (error.data) console.error('Data:', error.data)
  console.error('Suggestion:', getContractErrorSuggestion(error))
  console.groupEnd()
}