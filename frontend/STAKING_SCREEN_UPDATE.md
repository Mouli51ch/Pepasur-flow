# Staking Screen Update Guide - Quick Reference

The `staking-screen.tsx` is complex. Here's a simplified approach to get it working quickly.

## Quick Option: Use Simplified Version

Create a new simplified staking screen that works with Flow EVM:

**File:** `components/staking-screen-simple.tsx`

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAccount, useBalance } from 'wagmi'
import { useGameContract, formatFlow, parseFlow } from '@/hooks/useGameContract'
import { useToast } from "@/hooks/use-toast"

interface StakingScreenProps {
  playerAddress: string
  onStakeSuccess: (gameId?: string, roomCode?: string) => void
  onCancel: () => void
  mode: 'create' | 'join'
  initialRoomCode?: string
}

export default function StakingScreen({
  playerAddress,
  onStakeSuccess,
  onCancel,
  mode,
  initialRoomCode
}: StakingScreenProps) {
  const [roomCode, setRoomCode] = useState(initialRoomCode || '')
  const [stakeAmountInput, setStakeAmountInput] = useState('0.001')
  const [minPlayers, setMinPlayers] = useState(4)
  const [isLoading, setIsLoading] = useState(false)

  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address: address as `0x${string}` })
  const { createGame, joinGame, isPending } = useGameContract()
  const { toast } = useToast()

  const handleCreateGame = async () => {
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      // Create game on-chain
      const txHash = await createGame(stakeAmountInput, minPlayers)

      console.log('Game created! TX:', txHash)
      toast({ title: "Success!", description: `Game created! TX: ${txHash}` })

      // Call backend to register game
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: address,
          stakeAmount: parseFlow(stakeAmountInput).toString(),
          minPlayers: minPlayers,
          isPublic: false
        })
      })

      const data = await response.json()

      if (data.success) {
        onStakeSuccess(data.gameId, data.roomCode)
      }
    } catch (error: any) {
      console.error('Error creating game:', error)
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinGame = async () => {
    if (!isConnected || !roomCode) {
      toast({ title: "Error", description: "Please enter a room code", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      // Get game ID from room code
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/game/by-room-code/${roomCode}`)
      const data = await response.json()

      if (!data.success || !data.game) {
        throw new Error('Game not found')
      }

      // Join game on-chain
      const gameId = data.game.onChainGameId
      const txHash = await joinGame(gameId, stakeAmountInput)

      console.log('Joined game! TX:', txHash)
      toast({ title: "Success!", description: `Joined game! TX: ${txHash}` })

      onStakeSuccess(data.game.gameId, roomCode)
    } catch (error: any) {
      console.error('Error joining game:', error)
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gaming-bg scanlines">
      <Card className="w-full max-w-md p-6 bg-[#111111]/90 backdrop-blur-sm border border-[#2a2a2a]">
        <h2 className="text-2xl font-press-start pixel-text-3d-green mb-6 text-center">
          {mode === 'create' ? 'CREATE GAME' : 'JOIN GAME'}
        </h2>

        {/* Network Status */}
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded">
          <p className="text-sm text-green-400">
            {isConnected ? `✅ Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : '❌ Not Connected'}
          </p>
          {balance && (
            <p className="text-sm text-gray-400">
              Balance: {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </p>
          )}
        </div>

        {/* Stake Amount */}
        <div className="space-y-2 mb-4">
          <Label className="text-green-400">Stake Amount (FLOW)</Label>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            value={stakeAmountInput}
            onChange={(e) => setStakeAmountInput(e.target.value)}
            className="bg-black/50 border-green-500/30 text-white"
          />
          <p className="text-xs text-gray-400">Minimum: 0.001 FLOW</p>
        </div>

        {mode === 'create' ? (
          <>
            {/* Min Players */}
            <div className="space-y-2 mb-4">
              <Label className="text-green-400">Minimum Players</Label>
              <Input
                type="number"
                min="2"
                max="10"
                value={minPlayers}
                onChange={(e) => setMinPlayers(parseInt(e.target.value) || 4)}
                className="bg-black/50 border-green-500/30 text-white"
              />
            </div>

            <Button
              onClick={handleCreateGame}
              disabled={isLoading || isPending || !isConnected}
              variant="pixel"
              size="pixelLarge"
              className="w-full mb-3"
            >
              {isLoading || isPending ? 'CREATING...' : `STAKE ${stakeAmountInput} FLOW`}
            </Button>
          </>
        ) : (
          <>
            {/* Room Code */}
            <div className="space-y-2 mb-4">
              <Label className="text-green-400">Room Code</Label>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="bg-black/50 border-green-500/30 text-white font-mono text-lg text-center"
              />
            </div>

            <Button
              onClick={handleJoinGame}
              disabled={isLoading || isPending || !isConnected || !roomCode}
              variant="pixel"
              size="pixelLarge"
              className="w-full mb-3"
            >
              {isLoading || isPending ? 'JOINING...' : `JOIN WITH ${stakeAmountInput} FLOW`}
            </Button>
          </>
        )}

        <Button
          onClick={onCancel}
          variant="pixelOutline"
          size="pixelLarge"
          className="w-full"
        >
          CANCEL
        </Button>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-gray-400 space-y-1">
          <p>• Winners get 98% of total pool</p>
          <p>• 2% house cut applies</p>
          <p>• Transactions signed via MetaMask</p>
        </div>
      </Card>
    </div>
  )
}
```

## How to Use

**Option 1: Test the simplified version first**

1. Create the file above as `staking-screen-simple.tsx`
2. Temporarily update your main page to use it
3. Test create/join functionality
4. Once working, migrate features from original

**Option 2: Full migration (more time)**

Follow `FRONTEND_MIGRATION_GUIDE.md` section on staking-screen.tsx for complete update.

## Key Changes Summary

| Aptos | Flow EVM |
|-------|----------|
| `useWallet()` | `useAccount()` |
| `signAndSubmitTransaction()` | `useGameContract().createGame()` |
| `Aptos SDK` | `wagmi hooks` |
| Octas (10^-8) | Wei (10^-18) |
| APT | FLOW |
| Gasless mode | Standard gas (MetaMask pays) |

## Testing

1. Go to main page
2. Connect wallet
3. Click "CREATE LOBBY"
4. Should see simplified staking screen
5. Enter stake amount (e.g., 0.01 FLOW)
6. Click "STAKE"
7. MetaMask opens for approval
8. Game created!

## Notes

- Simplified version removes gasless mode (not needed on Flow EVM)
- Removes complex balance checking (wagmi handles it)
- Focuses on core create/join functionality
- Can add features back incrementally

## Full Update

For complete update with all features, see:
- `FRONTEND_MIGRATION_GUIDE.md` (lines 250-350)
- `app/wallet-test/page.tsx` (working example)
