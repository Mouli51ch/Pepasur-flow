"use client"

import { useEffect, useState } from "react"
import GifLoader from "@/components/gif-loader"
import RetroAnimation from "@/components/retro-animation"
import { soundService } from "@/services/SoundService"

export default function LoaderScreen() {
  const [dots, setDots] = useState("")
  const [messageIndex, setMessageIndex] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)

  // Play loading sound when component mounts
  useEffect(() => {
    soundService.playLoading()
  }, [])

  const loadingMessages = [
    "WAKING THE ASURS",
    "GATHERING THE MANAV",
    "CONSULTING THE RISHI",
    "LOADING ON-CHAIN"
  ]

  const tips = [
    "WHO CAN YOU TRUST?",
    "TIP: THE RISHI CAN EXPOSE AN ASUR.",
    "TIP: THE DEV CAN PROTECT ONE PLAYER EACH NIGHT.",
    "STAKE. PLAY. SURVIVE.",
    "ALL ACTIONS ARE FINAL AND ON-CHAIN."
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center gaming-bg scanlines relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(74, 140, 74, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74, 140, 74, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Main content */}
      <div className="text-center space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 px-4">
        <RetroAnimation type="pulse">
          <div className="relative">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-bold font-press-start tracking-wider">
              <span className="pixel-text-3d-green pixel-text-3d-float">P</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.1s' }}>E</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.2s' }}>P</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.3s' }}>A</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.4s' }}>S</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.5s' }}>U</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.6s' }}>R</span>
            </div>
          </div>
        </RetroAnimation>

        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-press-start text-[#4A8C4A] pixel-text-3d-green pixel-text-3d-glow transition-opacity duration-300">
            {loadingMessages[messageIndex]}{dots}
          </div>
          <div className="flex justify-center">
            <GifLoader size="xxl" />
          </div>
        </div>

        {/* Tips/Lore section */}
        <div className="mt-8">
          <div className="text-sm sm:text-base lg:text-lg font-press-start text-[#5FA85F] opacity-90 transition-opacity duration-500 text-center px-4" style={{
            textShadow: '0 0 10px rgba(74, 140, 74, 0.8), 0 0 20px rgba(74, 140, 74, 0.4)'
          }}>
            {tips[tipIndex]}
          </div>
        </div>

        {/* Additional decorative elements */}
        <div className="flex justify-center space-x-2 mt-4">
          <div className="w-1 h-1 bg-[#4A8C4A] pixelated animate-pulse"></div>
          <div className="w-1 h-1 bg-[#4A8C4A] pixelated animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-1 bg-[#4A8C4A] pixelated animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>

      {/* Corner decorative elements */}
      <div className="absolute top-4 left-4 w-4 h-4 border-2 border-[#4A8C4A] opacity-30 pixelated"></div>
      <div className="absolute top-4 right-4 w-4 h-4 border-2 border-[#4A8C4A] opacity-30 pixelated"></div>
      <div className="absolute bottom-4 left-4 w-4 h-4 border-2 border-[#4A8C4A] opacity-30 pixelated"></div>
      <div className="absolute bottom-4 right-4 w-4 h-4 border-2 border-[#4A8C4A] opacity-30 pixelated"></div>
    </div>
  )
}