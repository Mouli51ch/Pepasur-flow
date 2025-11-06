'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { NFTMetadata } from '../services/synapse-storage'

interface NFT extends Omit<NFTMetadata, 'price' | 'category' | 'rarity' | 'stats'> {
  price: string
  category: string
  rarity: string
  stats: {
    attack: number
    defense: number
    speed: number
    health: number
  }
}

interface NFTCardProps {
  nft: NFT
  onPurchase: (nft: NFT) => void
  onViewDetails: (nft: NFT) => void
  isLoading?: boolean
}

export default function NFTCard({ nft, onPurchase, onViewDetails, isLoading = false }: NFTCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return 'bg-[#A259FF] border-[#A259FF] text-white'
      case 'epic':
        return 'bg-[#4A8C4A] border-[#4A8C4A] text-white'
      case 'rare':
        return 'bg-[#00AAFF] border-[#00AAFF] text-white'
      case 'common':
        return 'bg-[#CCCC00] border-[#CCCC00] text-black'
      default:
        return 'bg-[#2a2a2a] border-[#2a2a2a] text-white'
    }
  }

  const getRarityGlow = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return 'shadow-[#A259FF]/20'
      case 'epic':
        return 'shadow-[#4A8C4A]/20'
      case 'rare':
        return 'shadow-[#00AAFF]/20'
      case 'common':
        return 'shadow-[#CCCC00]/20'
      default:
        return 'shadow-[#2a2a2a]/20'
    }
  }

  return (
    <div 
      className={`relative bg-[#111111]/90 backdrop-blur-sm border-2 border-[#2a2a2a] p-3 sm:p-4 md:p-6 transition-all duration-300 hover:border-[#4A8C4A] hover:shadow-lg hover:shadow-[#4A8C4A]/20 group cursor-pointer ${
        isHovered ? 'transform -translate-y-1' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewDetails(nft)}
    >
      {/* Rarity Badge */}
      <div className={`absolute top-2 sm:top-4 left-2 sm:left-4 px-2 sm:px-3 py-1 sm:py-2 rounded-none border-2 font-press-start text-xs sm:text-sm ${getRarityColor(nft.rarity)}`}>
        {nft.rarity.toUpperCase()}
      </div>

      {/* Storage Badge */}
      {nft.pieceCid && (
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 px-2 sm:px-3 py-1 sm:py-2 bg-[#4A8C4A] border-2 border-[#4A8C4A] text-white rounded-none font-press-start text-xs sm:text-sm">
          📁 STORED
        </div>
      )}

      {/* NFT Image */}
      <div className="text-center mb-3 sm:mb-4 md:mb-6">
        <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl pixelated group-hover:scale-110 transition-transform duration-300">
          {nft.image}
        </div>
      </div>

      {/* NFT Info */}
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        <div>
          <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-press-start pixel-text-3d-white mb-1 sm:mb-2">
            {nft.name}
          </h3>
          <p className="text-xs sm:text-sm font-press-start text-gray-400 leading-relaxed line-clamp-2">
            {nft.description}
          </p>
        </div>

        {/* Stats Preview */}
        <div className="grid grid-cols-2 gap-1 sm:gap-2">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-1 sm:p-2 text-center">
            <div className="text-xs font-press-start text-gray-400">ATK</div>
            <div className="text-xs sm:text-sm font-press-start pixel-text-3d-red">{nft.stats.attack}</div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-1 sm:p-2 text-center">
            <div className="text-xs font-press-start text-gray-400">DEF</div>
            <div className="text-xs sm:text-sm font-press-start pixel-text-3d-blue">{nft.stats.defense}</div>
          </div>
        </div>

        {/* Price */}
        <div className="text-center">
          <div className="text-sm sm:text-base md:text-lg lg:text-xl font-press-start pixel-text-3d-yellow">
            {nft.price}
          </div>
        </div>

        {/* Storage Info */}
        {nft.pieceCid && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-2 sm:p-3 rounded-none">
            <div className="text-xs font-press-start text-gray-400 mb-1">STORAGE</div>
            <div className="text-xs font-press-start text-[#4A8C4A] break-all">
              {nft.pieceCid.substring(0, 20)}...
            </div>
            <div className="text-xs font-press-start text-gray-500">Filecoin via Synapse</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-1 sm:space-y-2 md:space-y-3">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onPurchase(nft)
            }}
            disabled={isLoading}
            variant="pixel"
            size="pixel"
            className="w-full text-xs sm:text-sm"
          >
            {isLoading ? '⏳' : '🛒'} BUY
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails(nft)
            }}
            variant="pixelOutline"
            size="pixel"
            className="w-full text-xs sm:text-sm"
          >
            👁️ DETAILS
          </Button>
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br from-[#4A8C4A]/5 to-[#A259FF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
    </div>
  )
}