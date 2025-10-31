"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PixelInput } from "@/components/ui/pixel-input"
import { useSocket } from "@/contexts/EnhancedSocketContext"
import { Player } from "@/hooks/useGame" // Add this line
import TaskComponent from "./task-component"
import ColoredPlayerName from "@/components/colored-player-name"

interface DiscussionPhaseScreenProps {
  onComplete: () => void
  game?: any // Add game prop to get timer from backend
  gameId?: string // Add gameId for chat
  currentPlayerAddress?: string // Add current player address
  submitTaskAnswer?: (answer: any) => Promise<void> // Add task submission function
  players?: Player[] // Add players prop
}



export default function DiscussionPhaseScreen({ onComplete, game, gameId, currentPlayerAddress, submitTaskAnswer, players }: DiscussionPhaseScreenProps) {
  const [timeLeft, setTimeLeft] = useState(30) // 30 seconds for discussion
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat')
  const [hasTransitioned, setHasTransitioned] = useState(false)
  const { socket, sendChatMessage } = useSocket()

  const [messages, setMessages] = useState<Array<{
    id: string
    playerAddress: string
    message: string
    timestamp: number
  }>>([])

  // Listen for chat messages
  useEffect(() => {
    if (socket && gameId) {
      const handleChatMessage = (data: any) => {
        console.log('📨 Received chat message:', data)
        if (data.gameId === gameId) {
          console.log('📨 Adding message to UI:', data.message)
          setMessages(prev => [...prev, {
            id: `${data.playerAddress}-${data.timestamp}`,
            playerAddress: data.playerAddress,
            message: data.message,
            timestamp: data.timestamp
          }])
        } else {
          console.log('📨 Message gameId mismatch:', data.gameId, 'vs', gameId)
        }
      }

      socket.on('chat_message', handleChatMessage)

      return () => {
        socket.off('chat_message', handleChatMessage)
      }
    }
  }, [socket, gameId])

  // Real-time timer sync with backend
  useEffect(() => {
    if (game?.timeLeft !== undefined) {
      setTimeLeft(game.timeLeft)

      // Start local countdown to match backend
      if (game.timeLeft > 0) {
        const timer = setTimeout(() => {
          setTimeLeft(prev => Math.max(0, prev - 1))
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [game?.timeLeft])

  const handleSendMessage = () => {
    if (message.trim() && gameId && currentPlayerAddress && sendChatMessage) {
      try {
        sendChatMessage({
          gameId,
          playerAddress: currentPlayerAddress,
          message: message.trim(),
          timestamp: Date.now()
        })
        setMessage("")
        console.log('Chat message sent:', message.trim())
      } catch (error) {
        console.error('Failed to send chat message:', error)
      }
    }
  }



  // Get current player's task count from game state
  const currentPlayerTaskCount = game?.taskCounts?.[currentPlayerAddress || ''] || 0
  const maxTaskCount = 4 // Global task count target

  // Log task count updates for debugging
  useEffect(() => {
    if (currentPlayerAddress && game?.taskCounts) {
      console.log(`📊 Current player task count: ${currentPlayerTaskCount}/${maxTaskCount}`)
    }
  }, [currentPlayerTaskCount, maxTaskCount, currentPlayerAddress, game?.taskCounts])

  return (
    <div className="min-h-screen gaming-bg pt-8 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="p-2 sm:p-3 lg:p-4 border-b-2 border-[#4A8C4A] bg-gradient-to-r from-[#0A0A0A] to-[#1A1A1A] relative">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-1 sm:space-y-0">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="text-lg sm:text-xl lg:text-2xl">💬</div>
              <h1 className="text-sm sm:text-base lg:text-lg font-press-start pixel-text-3d-white pixel-text-3d-float">DISCUSSION PHASE</h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="text-sm sm:text-base lg:text-lg font-press-start pixel-text-3d-green timer-pulse">
                ⏰ {timeLeft}s
              </div>
              <div className="w-2 h-2 bg-[#4A8C4A] animate-pulse rounded-none"></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 mt-3 sm:mt-4">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 sm:px-4 py-2 font-press-start text-xs sm:text-sm border-2 transition-all ${activeTab === 'chat'
                ? 'bg-[#4A8C4A] border-[#4A8C4A] pixel-text-3d-white tab-active'
                : 'bg-[#A259FF]/20 border-[#A259FF] pixel-text-3d-white hover:bg-[#A259FF]/30'
                }`}
            >
              💬 CHAT
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 sm:px-4 py-2 font-press-start text-xs sm:text-sm border-2 transition-all ${activeTab === 'tasks'
                ? 'bg-[#4A8C4A] border-[#4A8C4A] pixel-text-3d-white tab-active'
                : currentPlayerTaskCount >= maxTaskCount
                  ? 'bg-green-600/30 border-green-400 text-green-300 hover:bg-green-600/40'
                  : currentPlayerTaskCount > 0
                    ? 'bg-yellow-600/30 border-yellow-400 text-yellow-300 hover:bg-yellow-600/40'
                    : 'bg-[#A259FF]/20 border-[#A259FF] pixel-text-3d-white hover:bg-[#A259FF]/30'
                }`}
            >
              🎯 TASKS ({currentPlayerTaskCount}/{maxTaskCount})
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {activeTab === 'chat' ? (
            <>
              {/* Chat Messages */}
              <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-2 sm:space-y-3 bg-[#111111]/50 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 font-press-start text-sm">
                    No messages yet. Start the discussion!
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isTaskAnnouncement = msg.type === 'task_success' || msg.type === 'task_failure'
                    // For task announcements, use taskPlayerAddress to find the player
                    const messagePlayer = players?.find(p => p.address === (isTaskAnnouncement ? msg.taskPlayerAddress : msg.playerAddress))
                    const isCurrentPlayer = msg.playerAddress === currentPlayerAddress && msg.playerAddress !== 'SYSTEM'
                    const isSystemMessage = msg.type === 'system' || msg.playerAddress === 'SYSTEM'

                    return (
                      <div key={`${msg.id}-${index}`} className={`font-press-start text-xs sm:text-sm md:text-base pixel-text-3d-white p-2 sm:p-3 md:p-4 border chat-message-glow chat-message-enter ${isTaskAnnouncement
                        ? msg.type === 'task_success'
                          ? 'bg-green-900/40 border-green-500/50'
                          : 'bg-red-900/40 border-red-500/50'
                        : isSystemMessage
                          ? 'bg-blue-900/40 border-blue-500/50'
                          : 'bg-[#1A1A1A]/80 border-[#2A2A2A]'
                        }`}>
                        <div className="flex items-center space-x-2">
                          {/* Player avatar - show for all message types */}
                          {(messagePlayer?.avatar || msg.avatarUrl) && (messagePlayer?.avatar?.startsWith('http') || msg.avatarUrl?.startsWith('http')) ? (
                            <img
                              src={messagePlayer?.avatar || msg.avatarUrl}
                              alt={messagePlayer?.name || msg.playerName || 'Player'}
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-none object-cover border border-gray-600"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          ) : (
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-700 flex items-center justify-center text-xs">?</div>
                          )}
                          <span className={isCurrentPlayer ? "text-[#4A8C4A]" : ""}>
                            {isTaskAnnouncement ? (
                              messagePlayer ? (
                                <ColoredPlayerName
                                  playerName={messagePlayer.name}
                                />
                              ) : (
                                <span className={msg.type === 'task_success' ? 'text-green-400' : 'text-red-400'}>
                                  Player
                                </span>
                              )
                            ) : msg.playerAddress === 'SYSTEM' ? (
                              <span className="text-yellow-400">🤖 SYSTEM</span>
                            ) : isCurrentPlayer ? 'You' : (
                              <ColoredPlayerName
                                playerName={messagePlayer?.name || msg.playerName || 'Player'}
                              />
                            )}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className={`mt-1 ${isTaskAnnouncement ? (msg.type === 'task_success' ? 'text-green-300' : 'text-red-300') : ''}`}>
                          {msg.message}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            /* Tasks Tab - Real Task Component */
            <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto min-h-0">
              {/* Task Counts Display */}
              {game?.taskCounts && players && players.length > 0 && (
                <div className="mb-4 p-3 bg-gray-900/50 border border-gray-600 rounded-none" style={{ minHeight: '120px' }}>
                  <h4 className="text-sm font-press-start text-yellow-400 mb-2">📊 TASK COUNTS</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {players.map(player => {
                      const taskCount = game.taskCounts[player.address] || 0;
                      return (
                        <div key={player.address} className="flex items-center space-x-2 text-xs h-6">
                          <img
                            src={player.avatar}
                            alt={player.name}
                            className="w-4 h-4 rounded-none object-cover flex-shrink-0"
                            style={{ imageRendering: 'pixelated' }}
                          />
                          <ColoredPlayerName playerName={player.name} />
                          <span className={`font-bold ml-auto flex-shrink-0 ${taskCount > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                            {taskCount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {gameId && currentPlayerAddress && submitTaskAnswer ? (
                <TaskComponent
                  gameId={gameId}
                  currentPlayerAddress={currentPlayerAddress}
                  game={game}
                  submitTaskAnswer={submitTaskAnswer}
                  showHeader={false}
                />
              ) : (
                <div className="text-center text-gray-500 font-press-start text-sm">
                  Task system not available
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 md:p-6 border-t-2 border-[#4A8C4A] bg-gradient-to-r from-[#0A0A0A] to-[#1A1A1A] flex-shrink-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 md:space-x-4">
            <div className="flex-1 relative">
              <PixelInput
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full bg-[#1A1A1A] border-2 border-[#4A8C4A] text-white placeholder-[#666666] pixel-input-focus text-xs sm:text-sm md:text-base"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-[#4A8C4A] text-xs font-press-start">
                {message.length}/100
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              variant="pixel"
              size="pixelLarge"
              className="px-4 sm:px-6 md:px-8 text-xs sm:text-sm md:text-base"
            >
              🚀 SEND
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
