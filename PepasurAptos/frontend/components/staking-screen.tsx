"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import GifLoader from "@/components/gif-loader"
import RetroAnimation from "@/components/retro-animation"
import { useAccount, useBalance } from 'wagmi'
import { useGameContract, formatFlow, parseFlow } from '@/hooks/useGameContract'
import { useToast } from "@/hooks/use-toast"
import enhancedApiService from "@/services/enhancedApiService"
import { useApiErrorHandler } from "@/components/ApiErrorBoundary"
import ErrorHandler from "@/components/ErrorHandler"
import { parseContractError, getContractErrorSuggestion, logContractError } from "@/utils/contractErrorHandler"

interface StakingScreenProps {
  gameId?: string // Optional for room creation
  playerAddress: string
  onStakeSuccess: (gameId?: string, roomCode?: string) => void
  onCancel: () => void
  mode: 'create' | 'join' // New prop to distinguish between creating and joining
  onBrowsePublicLobbies?: () => void // Optional handler to browse public lobbies
  initialRoomCode?: string // Pre-fill room code (e.g., from public lobbies)
}

interface StakingInfo {
  gameId: string
  roomCode: string
  players: string[]
  playersCount: number
  minPlayers: number
  totalStaked: string
  totalStakedInFLOW: string
  status: string
  isReady: boolean
}

export default function StakingScreen({ gameId, playerAddress, onStakeSuccess, onCancel, mode, onBrowsePublicLobbies, initialRoomCode }: StakingScreenProps) {
  const [roomCode, setRoomCode] = useState(initialRoomCode || '')
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null)
  const [isStaking, setIsStaking] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null)
  const [createdGameId, setCreatedGameId] = useState<string | null>(null)
  const [joinGameId, setJoinGameId] = useState<string | null>(null)
  const [hasProcessedSuccess, setHasProcessedSuccess] = useState(false)

  const [stakeAmountInput, setStakeAmountInput] = useState('0.001');
  
  // Enhanced error handling
  const { error: apiError, isLoading: apiLoading, handleApiCall, clearError } = useApiErrorHandler()
  const [minPlayers, setMinPlayers] = useState(4);
  const [isPublic, setIsPublic] = useState(false);

  // Flow EVM wallet hooks
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address: address as `0x${string}` })
  const { createGame, joinGame, isPending } = useGameContract()
  const { toast } = useToast()

  // Update room code when initialRoomCode changes (e.g., from public lobbies)
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode)
    }
  }, [initialRoomCode])

  // Validate stake amount
  const getValidatedStakeAmount = () => {
    const parsed = parseFloat(stakeAmountInput);
    if (isNaN(parsed) || parsed < 0.001) {
      return 0.001;
    }
    return parsed;
  };

  const stakeAmount = getValidatedStakeAmount();
  const stakeAmountInFLOW = stakeAmount.toFixed(4);

  // Check if balance is sufficient
  const balanceInFLOW = balance ? parseFloat(balance.formatted) : 0;
  const hasSufficientBalance = balanceInFLOW >= stakeAmount;

  const handleStakeSuccess = async (transactionHash: string, gameId?: string, roomCodeParam?: string) => {
    try {
      console.log('🎯 handleStakeSuccess called:', { transactionHash, mode, gameId, roomCodeParam })
      console.log('✅ Contract staking successful!')
      console.log('Transaction hash:', transactionHash)

      // Record the stake in the backend
      const gameIdToRecord = gameId || (mode === 'create' ? createdGameId : joinGameId)
      if (gameIdToRecord) {
        try {
          const requestBody = {
            gameId: gameIdToRecord,
            playerAddress: playerAddress,
            transactionHash: transactionHash
          };
          console.log('📤 Sending record-stake request:', {
            ...requestBody,
            playerAddressType: typeof playerAddress,
            playerAddressValue: playerAddress
          });

          const apiResponse = await handleApiCall(
            () => enhancedApiService.recordStake(requestBody),
            (response) => {
              console.log('✅ Stake recorded in backend:', response.data)
            },
            (error) => {
              console.error('❌ Error recording stake:', error.message)
              setError('Stake successful but failed to join game. Please contact support.')
              setIsStaking(false)
            }
          )

          console.log('📥 Record-stake response:', apiResponse);

          if (apiResponse?.success && apiResponse.data) {

            // Navigate ONLY after successful recording to ensure player is added to game
            if (mode === 'create') {
              const finalGameId = gameId || createdGameId
              const finalRoomCode = roomCodeParam || createdRoomCode
              console.log('🎯 Create mode - calling onStakeSuccess with:', { finalGameId, finalRoomCode })
              onStakeSuccess(finalGameId || undefined, finalRoomCode || undefined)
            } else {
              // Use parameter values first, fall back to state if not provided
              const finalGameId = gameId || joinGameId
              const finalRoomCode = roomCodeParam || roomCode
              console.log('🎯 Join mode - calling onStakeSuccess with:', { finalGameId, finalRoomCode })
              onStakeSuccess(finalGameId || undefined, finalRoomCode)
            }
          } else {
            const errorMessage = apiResponse?.error?.message || 'Failed to record stake'
            console.error('❌ Failed to record stake:', errorMessage)
            setError('Stake successful but failed to join game. Please contact support.')
            setIsStaking(false)
          }
        } catch (error) {
          console.error('❌ Error recording stake:', error)
          setError('Stake successful but failed to join game. Please contact support.')
          setIsStaking(false)
        }
      } else {
        // No gameId to record - this shouldn't happen but handle gracefully
        console.error('❌ No gameId available to record stake')
        setError('Failed to join game. Please try again.')
        setIsStaking(false)
      }
    } catch (error) {
      console.error('❌ Error handling stake success:', error)
      setError('Staking successful but failed to proceed. Please try again.')
      setIsStaking(false)
    }
  }

  const handleStake = async () => {
    if (mode === 'create' && parseFloat(stakeAmountInput) < 0.001) {
      setError('Stake amount must be at least 0.001 FLOW');
      return;
    }

    // For joining mode, require room code
    if (mode === 'join' && !roomCode.trim()) {
      setError('Please enter a room code')
      return
    }

    if (!hasSufficientBalance) {
      setError('Insufficient balance. You need at least 0.001 FLOW to stake.')
      return
    }

    if (!isConnected || !address) {
      setError('Wallet not connected')
      return
    }

    try {
      setIsStaking(true)
      setError('')

      if (mode === 'create') {
        // For room creation: call backend first, then create game on-chain
        console.log('🎮 Creating room with staking...')
        console.log('Contract:', process.env.NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS)
        console.log('Stake Amount:', stakeAmount)

        try {
          // Step 1: Create game on-chain (4-player game)
          const maxPlayers = 4 // Fixed for 4-player games
          const txHash = await createGame(stakeAmountInput, minPlayers, maxPlayers)
          console.log('✅ On-chain game created! TX:', txHash)

          toast({
            title: "Game Created!",
            description: `Transaction: ${txHash}`,
          })

          // Step 2: Register game in backend using enhanced API service
          const apiResponse = await enhancedApiService.createGame({
            creatorAddress: address,
            stakeAmount: parseFlow(stakeAmountInput).toString(),
            minPlayers: minPlayers,
            isPublic: isPublic,
            transactionHash: txHash
          })

          if (apiResponse.success && apiResponse.data) {
            console.log('✅ Backend registered game:', apiResponse.data)
            setCreatedRoomCode(apiResponse.data.roomCode)
            setCreatedGameId(apiResponse.data.gameId)
            setHasProcessedSuccess(true)
            handleStakeSuccess(txHash, apiResponse.data.gameId, apiResponse.data.roomCode)
          } else {
            const errorMessage = apiResponse?.error?.message || 'Failed to register game'
            console.error('❌ Backend registration failed:', errorMessage)
            setError(`Game created on-chain but backend failed: ${errorMessage}`)
            setIsStaking(false)
          }
        } catch (error: any) {
          console.error('❌ Error creating game:', error)
          setError(`Failed to create game: ${error.message || 'Unknown error'}`)
          setIsStaking(false)
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          })
        }
      } else {
        // For joining: get gameId from room code, then join on-chain
        console.log('🎮 Joining room with staking...')
        console.log('Contract:', process.env.NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS)
        console.log('Room Code:', roomCode)
        console.log('Stake Amount:', stakeAmount)

        if (!gameId) {
          // First, get the gameId from the room code via backend using enhanced API service
          console.log('🔍 Getting gameId from room code...')
          const apiResponse = await handleApiCall(
            () => enhancedApiService.getGameByRoomCode(roomCode),
            undefined,
            (error) => {
              setError(`Failed to find room: ${error.message}`)
              setIsStaking(false)
            }
          )
          
          if (!apiResponse?.success || !apiResponse.data?.game) {
            return // Error already handled by handleApiCall
          }

          const gameData = apiResponse.data.game
          console.log('✅ Found game:', gameData)

          // Store the game manager's gameId for later use
          setJoinGameId(gameData.gameId)

          // Get the stake amount from the game (convert from Wei to FLOW)
          const gameStakeAmountInFLOW = formatFlow(gameData.stakeAmount || gameData.stake || '0')
          console.log('💰 Game stake amount:', gameStakeAmountInFLOW, 'FLOW')

          // Now join the game on-chain with the exact stake amount from the game
          console.log('💰 Joining game on-chain:', gameData.onChainGameId)

          try {
            const txHash = await joinGame(Number(gameData.onChainGameId), gameStakeAmountInFLOW)
            console.log('✅ Joined game! TX:', txHash)

            toast({
              title: "Joined Game!",
              description: `Transaction: ${txHash}`,
            })

            setHasProcessedSuccess(true)
            handleStakeSuccess(txHash, gameData.gameId, gameData.roomCode)
          } catch (error: any) {
            const contractError = parseContractError(error)
            const suggestion = getContractErrorSuggestion(contractError)
            
            logContractError(
              'Join Game (Room Code)',
              process.env.NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS || '',
              'joinGame',
              [Number(gameData.onChainGameId), gameStakeAmountInFLOW],
              contractError
            )
            
            const errorMessage = `${contractError.message}. ${suggestion}`
            setError(errorMessage)
            setIsStaking(false)
            
            toast({
              title: "Transaction Failed",
              description: errorMessage,
              variant: "destructive"
            })
          }
        } else {
          // We already have gameId, fetch game info to get stake amount using enhanced API service
          console.log('🔍 Fetching game info for gameId:', gameId)
          const apiResponse = await handleApiCall(
            () => enhancedApiService.getGame(gameId),
            undefined,
            (error) => {
              setError(`Failed to fetch game info: ${error.message}`)
              setIsStaking(false)
            }
          )
          
          if (!apiResponse?.success || !apiResponse.data?.game) {
            return // Error already handled by handleApiCall
          }

          const gameData = apiResponse.data.game
          const gameStakeAmountInFLOW = formatFlow(gameData.stakeAmount || gameData.stake || '0')
          console.log('💰 Game stake amount:', gameStakeAmountInFLOW, 'FLOW')

          // Now join the game on-chain with the exact stake amount
          console.log('💰 Joining game on-chain:', gameId)

          try {
            const txHash = await joinGame(Number(gameId), gameStakeAmountInFLOW)
            console.log('✅ Joined game! TX:', txHash)

            toast({
              title: "Joined Game!",
              description: `Transaction: ${txHash}`,
            })

            setHasProcessedSuccess(true)
            handleStakeSuccess(txHash, gameId)
          } catch (error: any) {
            const contractError = parseContractError(error)
            const suggestion = getContractErrorSuggestion(contractError)
            
            logContractError(
              'Join Game (Direct)',
              process.env.NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS || '',
              'joinGame',
              [Number(gameId), gameStakeAmountInFLOW],
              contractError
            )
            
            const errorMessage = `${contractError.message}. ${suggestion}`
            setError(errorMessage)
            setIsStaking(false)
            
            toast({
              title: "Transaction Failed",
              description: errorMessage,
              variant: "destructive"
            })
          }
        }
      }

    } catch (error) {
      console.error('Error staking:', error)
      setError(`Failed to stake: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsStaking(false)
    }
  }

  const getStakingStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-400'
      case 'full': return 'text-green-400'
      case 'started': return 'text-blue-400'
      case 'completed': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  const getStakingStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'WAITING FOR PLAYERS'
      case 'full': return 'READY TO START'
      case 'started': return 'GAME STARTED'
      case 'completed': return 'GAME COMPLETED'
      default: return 'UNKNOWN'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 gaming-bg scanlines">
      <Card className="w-[90vw] max-w-[480px] p-3 sm:p-4 lg:p-6 bg-[#111111]/80 border border-[#2a2a2a]">
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="text-center space-y-1 sm:space-y-2">
            <RetroAnimation type="bounce">
              <div className="text-2xl sm:text-3xl lg:text-4xl">💰</div>
            </RetroAnimation>
            <div className="text-lg sm:text-xl font-bold font-press-start pixel-text-3d-white">
              STAKE TO PLAY
            </div>
          </div>

          {/* Error Handler */}
          {apiError && (
            <ErrorHandler
              error={apiError}
              onRetry={apiError.retryable ? () => clearError() : undefined}
              onDismiss={() => clearError()}
              mode="inline"
            />
          )}

          {/* Balance and Network Info */}
          <div className="flex gap-4">
            {/* Balance Info */}
            {balance && (
              <div className="flex-1 p-2 sm:p-3 lg:p-4">
                <div className="space-y-1 sm:space-y-2">
                  <div className="text-xs sm:text-sm font-press-start text-gray-300">YOUR BALANCE</div>
                  <div className="text-base sm:text-lg font-bold text-white">
                    {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                  </div>
                  <div className={`text-xs sm:text-sm font-press-start ${hasSufficientBalance ? 'text-green-400' : 'text-red-400'}`}>
                    {hasSufficientBalance ? '✅ SUFFICIENT' : '❌ INSUFFICIENT'}
                  </div>
                </div>
              </div>
            )}

            {/* Network Info */}
            <div className="flex-1 p-2 sm:p-3 lg:p-4">
              <div className="space-y-1 sm:space-y-2">
                <div className="text-xs sm:text-sm font-press-start text-gray-300">NETWORK</div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {isConnected ? '✅ Flow EVM' : '❌ Not Connected'}
                </div>
                {!isConnected && (
                  <div className="text-xs sm:text-sm text-yellow-400">
                    Please connect your wallet
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border my-4"></div>

          {/* Public/Private Toggle - Only show for create mode */}
          {mode === 'create' && (
            <Card className="p-2 sm:p-3 bg-[#1a1a1a]/50 border border-[#333333]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-press-start text-gray-300">ROOM VISIBILITY</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isPublic ? 'Anyone can see and join' : 'Only with room code'}
                  </div>
                </div>
                <Button
                  onClick={() => setIsPublic(!isPublic)}
                  variant={isPublic ? 'pixel' : 'outline'}
                  size="pixel"
                  className="text-xs"
                >
                  {isPublic ? '🌐 PUBLIC' : '🔒 PRIVATE'}
                </Button>
              </div>
            </Card>
          )}

          {/* Stake Amount Input - Only show for create mode */}
          {mode === 'create' && (
            <>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="stakeAmount" className="text-xs sm:text-sm font-press-start text-gray-300">
                  STAKE AMOUNT (FLOW)
                </Label>
                <Input
                  id="stakeAmount"
                  type="number"
                  value={stakeAmountInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for editing
                    if (value === '') {
                      setStakeAmountInput('');
                      return;
                    }
                    // Prevent negative numbers
                    const num = parseFloat(value);
                    if (num < 0) {
                      setStakeAmountInput('0.001');
                      return;
                    }
                    setStakeAmountInput(value);
                  }}
                  onBlur={() => {
                    // Enforce minimum on blur
                    const num = parseFloat(stakeAmountInput);
                    if (isNaN(num) || num < 0.001) {
                      setStakeAmountInput('0.001');
                    }
                  }}
                  placeholder="Enter stake amount"
                  min="0.001"
                  step="0.001"
                  className="font-press-start text-center text-sm sm:text-lg tracking-widest"
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="minPlayers" className="text-xs sm:text-sm font-press-start text-gray-300">
                  MINIMUM PLAYERS
                </Label>
                <Input
                  id="minPlayers"
                  type="number"
                  value={minPlayers}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 4;
                    setMinPlayers(Math.max(2, Math.min(10, value)));
                  }}
                  min="2"
                  max="10"
                  className="font-press-start text-center text-sm sm:text-lg tracking-widest"
                />
              </div>
            </>
          )}

          {/* Join mode UI */}
          {mode === 'join' && (
            <>
              {/* Group 1: Join with Room Code */}
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <Input
                  id="roomCode"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-char room code"
                  maxLength={6}
                  className="w-full font-press-start text-left text-lg tracking-widest p-4 bg-black/50 border-2 border-border focus:border-primary focus:ring-primary"
                />
                <Button
                  onClick={handleStake}
                  disabled={isStaking || isPending || !isConnected || !hasSufficientBalance || roomCode.length !== 6}
                  variant="pixel"
                  size="pixelLarge"
                  className="w-full"
                >
                  {isStaking || isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <GifLoader size="sm" />
                      <span>STAKING...</span>
                    </div>
                  ) : (
                    `💰 Stake to join `
                  )}
                </Button>
              </div>

              {/* Separator */}
              <div className="flex items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs text-gray-500">OR</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              {/* Group 2: Browse Public Lobbies */}
              {onBrowsePublicLobbies && (
                <div>
                  <Button
                    onClick={onBrowsePublicLobbies}
                    variant="outline"
                    size="pixelLarge"
                    className="w-full"
                  >
                    🌐 BROWSE PUBLIC LOBBIES
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Error Message */}
          {error && (
            <Card className="p-2 sm:p-3 bg-red-900/20 border border-red-500/50">
              <div className="text-xs sm:text-sm text-red-400 font-press-start">
                ❌ {error}
              </div>
            </Card>
          )}

          {/* Staking Info */}
          {stakingInfo && (
            <Card className="p-2 sm:p-3 lg:p-4 bg-[#1a1a1a]/50 border border-[#333333]">
              <div className="space-y-1 sm:space-y-2">
                <div className="text-xs sm:text-sm font-press-start text-gray-300">GAME STATUS</div>
                <div className={`text-base sm:text-lg font-bold font-press-start ${getStakingStatusColor(stakingInfo.status)}`}>
                  {getStakingStatusText(stakingInfo.status)}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  Players: {stakingInfo.playersCount}/{stakingInfo.minPlayers}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  Total Staked: {stakingInfo.totalStakedInFLOW} FLOW
                </div>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3">
            {mode === 'create' && (
              <Button
                onClick={handleStake}
                disabled={isStaking || isPending || !isConnected || !hasSufficientBalance}
                variant="pixel"
                size="pixelLarge"
                className="w-full"
              >
                {isStaking || isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <GifLoader size="sm" />
                    <span>STAKING...</span>
                  </div>
                ) : (
                  `🎮 STAKE ${stakeAmountInFLOW} FLOW`
                )}
              </Button>
            )}

            <Button
              onClick={onCancel}
              variant="outline"
              size="pixelLarge"
              className="w-full"
            >
              CANCEL
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 text-center space-y-0.5 sm:space-y-1">
            <div>• Minimum stake: 0.001 FLOW</div>
            <div>• Winners get 98% of total pool</div>
            <div>• Losers get 0% of total pool</div>
            <div>• 2% house cut applies</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
