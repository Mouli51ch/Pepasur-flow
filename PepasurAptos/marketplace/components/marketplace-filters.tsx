'use client'

import { useState } from 'react'
import { Button } from './ui/button'

interface Filters {
  category: string
  rarity: string
  priceRange: number[]
}

interface MarketplaceFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

const categories = [
  { value: 'all', label: 'ALL CATEGORIES' },
  { value: 'Character', label: 'CHARACTERS' },
  { value: 'Weapon', label: 'WEAPONS' },
  { value: 'Armor', label: 'ARMOR' },
  { value: 'Accessory', label: 'ACCESSORIES' }
]

const rarities = [
  { value: 'all', label: 'ALL RARITIES' },
  { value: 'Legendary', label: 'LEGENDARY', color: 'text-[#A259FF]' },
  { value: 'Epic', label: 'EPIC', color: 'text-[#4A8C4A]' },
  { value: 'Rare', label: 'RARE', color: 'text-[#00AAFF]' },
  { value: 'Common', label: 'COMMON', color: 'text-[#CCCC00]' }
]

export default function MarketplaceFilters({ filters, onFiltersChange }: MarketplaceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ ...filters, category })
  }

  const handleRarityChange = (rarity: string) => {
    onFiltersChange({ ...filters, rarity })
  }

  const clearFilters = () => {
    onFiltersChange({
      category: 'all',
      rarity: 'all',
      priceRange: [0, 1000]
    })
  }

  const hasActiveFilters = filters.category !== 'all' || filters.rarity !== 'all'

  return (
    <div className="bg-[#111111]/90 backdrop-blur-sm border-2 border-[#2a2a2a] p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-press-start pixel-text-3d-white">
          FILTERS
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#4A8C4A] hover:text-[#4A8C4A]/80 transition-colors text-lg sm:text-xl"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Categories */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-sm sm:text-base font-press-start pixel-text-3d-white border-b border-[#2a2a2a] pb-2">
              CATEGORIES
            </h4>
            <div className="space-y-2 sm:space-y-3">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => handleCategoryChange(category.value)}
                  className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-press-start transition-all duration-200 border-2 ${
                    filters.category === category.value
                      ? 'bg-[#4A8C4A] border-[#4A8C4A] text-white'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-300 hover:border-[#4A8C4A] hover:text-white'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rarities */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-sm sm:text-base font-press-start pixel-text-3d-white border-b border-[#2a2a2a] pb-2">
              RARITIES
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {rarities.map((rarity) => (
                <button
                  key={rarity.value}
                  onClick={() => handleRarityChange(rarity.value)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-press-start transition-all duration-200 border-2 ${
                    filters.rarity === rarity.value
                      ? 'bg-[#4A8C4A] border-[#4A8C4A] text-white'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-300 hover:border-[#4A8C4A] hover:text-white'
                  } ${rarity.color || ''}`}
                >
                  {rarity.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-sm sm:text-base font-press-start pixel-text-3d-white border-b border-[#2a2a2a] pb-2">
              PRICE RANGE
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={filters.priceRange[0]}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    priceRange: [parseFloat(e.target.value), filters.priceRange[1]]
                  })}
                  className="flex-1 h-2 bg-[#1a1a1a] border border-[#2a2a2a] appearance-none cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-press-start text-gray-300 min-w-[3rem]">
                  {filters.priceRange[0]} FIL
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={filters.priceRange[1]}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    priceRange: [filters.priceRange[0], parseFloat(e.target.value)]
                  })}
                  className="flex-1 h-2 bg-[#1a1a1a] border border-[#2a2a2a] appearance-none cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-press-start text-gray-300 min-w-[3rem]">
                  {filters.priceRange[1]} FIL
                </span>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="pt-4 sm:pt-6 border-t border-[#2a2a2a]">
              <Button
                onClick={clearFilters}
                variant="pixelOutline"
                size="pixel"
                className="w-full"
              >
                🗑️ CLEAR FILTERS
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-3 sm:p-4 space-y-2">
            <h4 className="text-xs sm:text-sm font-press-start pixel-text-3d-white">
              MARKETPLACE STATS
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm font-press-start text-gray-400">
              <div>Total Items: 8</div>
              <div>Categories: 4</div>
              <div>Avg Price: 0.5 FIL</div>
              <div>Storage: Active</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}