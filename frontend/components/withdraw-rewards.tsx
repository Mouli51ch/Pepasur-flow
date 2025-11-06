"use client"

import { useState } from "react"
import { useAccount } from 'wagmi'
import { useGameContract, formatFlow } from '@/hooks/useGameContract'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface WithdrawRewardsProps {
  gameId: string
  playerAddress: string
  rewardAmount: string
  rewardInFLOW: string
  onWithdrawSuccess?: (transactionHash: string) => void
  renderButton?: boolean
  settlementTxHash?: string
}

export default function WithdrawRewards({ gameId, playerAddress, rewardAmount, rewardInFLOW, onWithdrawSuccess, renderButton = true, settlementTxHash }: WithdrawRewardsProps) {
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string>('')
  const [error, setError] = useState<string>('')

  const { address } = useAccount()
  const { withdraw, isPending } = useGameContract()
  const { toast } = useToast()

  // Normalize addresses for comparison (remove 0x prefix and convert to lowercase)
  const normalizeAddress = (addr: string | undefined | null): string => {
    if (!addr) return ''
    return addr.toLowerCase().replace(/^0x/, '')
  }

  const isCorrectWallet = address && playerAddress &&
    normalizeAddress(address) === normalizeAddress(playerAddress)

  console.log('Withdraw wallet check:', {
    accountAddress: address,
    playerAddress,
    normalizedAccount: normalizeAddress(address),
    normalizedPlayer: normalizeAddress(playerAddress),
    isCorrectWallet
  })

  const handleWithdraw = async () => {
    if (!address || !isCorrectWallet) {
      toast({
        title: "Wrong Wallet",
        description: "Please connect the correct wallet",
        variant: "destructive"
      })
      return
    }

    setIsWithdrawing(true)
    setError('')

    try {
      const txHash = await withdraw()
      console.log('✅ Withdrawal transaction confirmed:', txHash)

      toast({
        title: "Success!",
        description: `Withdrawn ${rewardInFLOW} FLOW`,
      })

      setTransactionHash(txHash)
      setIsSuccess(true)
      if (onWithdrawSuccess) {
        onWithdrawSuccess(txHash)
      }
    } catch (error: any) {
      console.error('❌ Error withdrawing rewards:', error)
      const errorMessage = error.message || 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: "Withdrawal Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsWithdrawing(false)
    }
  }

  // Handle successful withdrawal
  if (isSuccess && transactionHash) {
    return (
      <Card className="p-4 bg-green-900/50 border-green-500/50 rounded-none backdrop-blur-sm">
        <div className="text-center space-y-1">
          <div className="text-green-400 text-2xl mb-2">✅</div>
          <div className="text-green-300 font-bold font-press-start mb-3">Rewards Withdrawn!</div>

          {/* Settlement Hash */}
          {settlementTxHash && (
            <div className="text-xs font-press-start">
              <span className="text-yellow-300">Settlement: </span>
              <span className="font-mono text-gray-300 break-all">{settlementTxHash}</span>
            </div>
          )}

          {/* Withdrawal Transaction */}
          <div className="text-xs font-press-start">
            <span className="text-green-300">Transaction: </span>
            <span className="font-mono text-gray-300 break-all">{transactionHash}</span>
          </div>

          {/* Amount */}
          <div className="text-xs font-press-start">
            <span className="text-blue-300">Amount: </span>
            <span className="text-white font-bold">{rewardInFLOW} FLOW</span>
          </div>

          {/* View on Explorer */}
          <div className="mt-2">
            <a
              href={`https://evm-testnet.flowscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              View on FlowScan →
            </a>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 bg-gray-900/50 border-gray-500/50 rounded-none backdrop-blur-sm">
      <div className="text-center space-y-3">
        <h3 className="text-sm font-bold text-yellow-400 font-press-start mb-3">💰 TRANSACTION DETAILS</h3>

        {/* Settlement Hash */}
        {settlementTxHash && (
          <div className="text-xs font-press-start mb-2">
            <span className="text-yellow-300">Settlement: </span>
            <span className="font-mono text-gray-300 break-all">{settlementTxHash}</span>
          </div>
        )}

        {/* Amount */}
        <div className="text-xs font-press-start mb-4">
          <span className="text-blue-300">Amount: </span>
          <span className="text-white font-bold">{rewardInFLOW} FLOW</span>
        </div>

        <Button
          onClick={handleWithdraw}
          disabled={isWithdrawing || isPending || !isCorrectWallet}
          variant="pixel"
          size="pixelLarge"
          className="w-full"
        >
          {isWithdrawing || isPending ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin">⏳</div>
              <span>WITHDRAWING...</span>
            </div>
          ) : (
            `💰 WITHDRAW ${rewardInFLOW} FLOW`
          )}
        </Button>
        {error && (
          <div className="text-red-400 text-sm">
            Error: {error}
          </div>
        )}
        {address && playerAddress && !isCorrectWallet && (
          <div className="text-yellow-400 text-sm">
            Please connect the wallet that played this game
            <div className="text-xs text-gray-400 mt-1">
              Connected: {normalizeAddress(address).slice(0, 8)}...
              <br />
              Expected: {normalizeAddress(playerAddress).slice(0, 8)}...
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
