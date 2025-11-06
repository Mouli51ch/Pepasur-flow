"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useReadContract } from 'wagmi'
import { PEPASUR_SIMPLE_ABI } from '@/hooks/useGameContract'
import { formatEther } from 'viem'
import enhancedApiService from '@/services/enhancedApiService'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS as `0x${string}`

interface GameDiagnosticsProps {
  gameId?: string
  roomCode?: string
}

export function GameDiagnostics({ gameId, roomCode }: GameDiagnosticsProps) {
  const [diagnosticGameId, setDiagnosticGameId] = useState(gameId || '')
  const [diagnosticRoomCode, setDiagnosticRoomCode] = useState(roomCode || '')
  const [backendGameData, setBackendGameData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Read contract game data
  const { data: contractGameData, error: contractError, refetch: refetchContract } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PEPASUR_SIMPLE_ABI,
    functionName: 'getGame',
    args: diagnosticGameId ? [BigInt(diagnosticGameId)] : undefined,
    query: {
      enabled: !!diagnosticGameId && !isNaN(Number(diagnosticGameId))
    }
  })

  const fetchBackendData = async () => {
    if (!diagnosticRoomCode && !diagnosticGameId) return

    setIsLoading(true)
    try {
      let response
      if (diagnosticRoomCode) {
        response = await enhancedApiService.getGameByRoomCode(diagnosticRoomCode)
      } else {
        response = await enhancedApiService.getGame(diagnosticGameId)
      }

      if (response.success && response.data) {
        setBackendGameData(response.data.game)
      } else {
        setBackendGameData({ error: response.error?.message || 'Failed to fetch game data' })
      }
    } catch (error: any) {
      setBackendGameData({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const getGameStatus = (status: number) => {
    switch (status) {
      case 0: return 'WAITING_FOR_PLAYERS'
      case 1: return 'ACTIVE'
      case 2: return 'COMPLETED'
      default: return `UNKNOWN(${status})`
    }
  }

  const diagnoseIssues = () => {
    const issues = []

    if (contractGameData && backendGameData && !backendGameData.error) {
      const gameData = contractGameData as any
      
      // Check stake amount mismatch
      const contractStake = formatEther(gameData.stakeAmount as bigint)
      const backendStake = formatEther(BigInt(backendGameData.stakeAmount || '0'))
      
      if (contractStake !== backendStake) {
        issues.push(`⚠️ Stake amount mismatch: Contract=${contractStake} FLOW, Backend=${backendStake} FLOW`)
      }

      // Check game status
      const contractStatus = gameData.status as number
      if (contractStatus !== 0) {
        issues.push(`⚠️ Game not accepting players: Status=${getGameStatus(contractStatus)}`)
      }

      // Check player capacity
      const players = gameData.players as string[]
      const minPlayers = gameData.minPlayers as number
      
      if (players.length >= minPlayers) {
        issues.push(`⚠️ Game might be full: ${players.length}/${minPlayers} players`)
      }

      // Check total pool
      const totalPool = formatEther(gameData.totalPool as bigint)
      if (totalPool === '0') {
        issues.push(`⚠️ Total pool is 0 FLOW - no rewards to distribute`)
      }

      // Check onChainGameId consistency
      const contractGameId = gameData.id as bigint
      const backendOnChainId = backendGameData.onChainGameId
      
      if (backendOnChainId && contractGameId.toString() !== backendOnChainId.toString()) {
        issues.push(`⚠️ Game ID mismatch: Contract=${contractGameId.toString()}, Backend=${backendOnChainId}`)
      }
    }

    if (contractError) {
      issues.push(`❌ Contract error: ${contractError.message}`)
    }

    if (backendGameData?.error) {
      issues.push(`❌ Backend error: ${backendGameData.error}`)
    }

    return issues
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Game Diagnostics</h3>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="gameId">Contract Game ID</Label>
            <Input
              id="gameId"
              value={diagnosticGameId}
              onChange={(e) => setDiagnosticGameId(e.target.value)}
              placeholder="Enter game ID"
            />
          </div>
          <div>
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              value={diagnosticRoomCode}
              onChange={(e) => setDiagnosticRoomCode(e.target.value)}
              placeholder="Enter room code"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={fetchBackendData} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Fetch Backend Data'}
          </Button>
          <Button onClick={() => refetchContract()} variant="outline">
            Refresh Contract Data
          </Button>
        </div>
      </div>

      {/* Issues */}
      <div className="space-y-2">
        <h4 className="font-semibold">Diagnostic Issues:</h4>
        <div className="space-y-1">
          {diagnoseIssues().map((issue, index) => (
            <div key={index} className="text-sm p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
              {issue}
            </div>
          ))}
          {diagnoseIssues().length === 0 && (
            <div className="text-sm p-2 bg-green-900/20 border border-green-500/30 rounded">
              ✅ No issues detected
            </div>
          )}
        </div>
      </div>

      {/* Contract Data */}
      {contractGameData && (
        <div className="space-y-2">
          <h4 className="font-semibold">Contract Game Data:</h4>
          <div className="text-sm space-y-1 font-mono">
            {(() => {
              const gameData = contractGameData as any
              return (
                <>
                  <div>ID: {(gameData.id as bigint).toString()}</div>
                  <div>Creator: {gameData.creator as string}</div>
                  <div>Stake Amount: {formatEther(gameData.stakeAmount as bigint)} FLOW</div>
                  <div>Min Players: {(gameData.minPlayers as number).toString()}</div>
                  <div>Players: [{(gameData.players as string[]).join(', ')}]</div>
                  <div>Status: {getGameStatus(gameData.status as number)}</div>
                  <div>Total Pool: {formatEther(gameData.totalPool as bigint)} FLOW</div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Backend Data */}
      {backendGameData && (
        <div className="space-y-2">
          <h4 className="font-semibold">Backend Game Data:</h4>
          <div className="text-sm">
            <pre className="whitespace-pre-wrap bg-gray-900 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(backendGameData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Card>
  )
}

export default GameDiagnostics