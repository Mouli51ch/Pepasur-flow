'use client'

import { useState, useEffect } from 'react'
import { NFTMetadata, pepasurStorage } from '../services/synapse-storage'
import NFTCard from '../components/nft-card'
import MarketplaceFilters from '../components/marketplace-filters'
import { Button } from '../components/ui/button'
import toast from 'react-hot-toast'

// Extended NFT interface for marketplace display
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

// Mock NFT data with Synapse storage integration
const mockNFTs: NFT[] = [
  {
    id: '1',
    name: '🔥 PEPE WARRIOR',
    description: 'Legendary Pepe warrior with enhanced combat abilities',
    image: '🐸',
    price: '0.5 FIL',
    category: 'Character',
    rarity: 'Legendary',
    stats: { attack: 95, defense: 88, speed: 75, health: 100 },
    isListed: true,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    pieceCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  },
  {
    id: '2',
    name: '⚡ LIGHTNING SWORD',
    description: 'Mystical sword that channels the power of lightning',
    image: '⚔️',
    price: '0.3 FIL',
    category: 'Weapon',
    rarity: 'Epic',
    stats: { attack: 120, defense: 0, speed: 90, health: 0 },
    isListed: true,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
    pieceCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  },
  {
    id: '3',
    name: '🛡️ DRAGON SHIELD',
    description: 'Ancient shield forged from dragon scales',
    image: '🛡️',
    price: '0.4 FIL',
    category: 'Armor',
    rarity: 'Rare',
    stats: { attack: 0, defense: 110, speed: 20, health: 50 },
    isListed: true,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 259200000,
    pieceCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  },
  {
    id: '4',
    name: '💎 CRYSTAL CROWN',
    description: 'Royal crown that enhances magical abilities',
    image: '👑',
    price: '0.8 FIL',
    category: 'Accessory',
    rarity: 'Legendary',
    stats: { attack: 30, defense: 40, speed: 60, health: 80 },
    isListed: true,
    createdAt: Date.now() - 345600000,
    updatedAt: Date.now() - 345600000,
    pieceCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  },
  {
    id: '5',
    name: '🔥 FIRE GLOVES',
    description: 'Gloves that burn with eternal flames',
    image: '🧤',
    price: '0.2 FIL',
    category: 'Accessory',
    rarity: 'Common',
    stats: { attack: 45, defense: 25, speed: 40, health: 30 },
    isListed: true,
    createdAt: Date.now() - 432000000,
    updatedAt: Date.now() - 432000000,
    pieceCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  },
  {
    id: '6',
    name: '🌟 STAR WAND',
    description: 'Wand that channels the power of the stars',
    image: '🪄',
    price: '0.6 FIL',
    category: 'Weapon',
    rarity: 'Epic',
    stats: { attack: 85, defense: 20, speed: 95, health: 40 },
    isListed: true,
    createdAt: Date.now() - 518400000,
    updatedAt: Date.now() - 518400000,
    pieceCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  },
  {
    id: '7',
    name: '👻 GHOST CAPE',
    description: 'Ethereal cape that grants invisibility',
    image: '👻',
    price: '0.7 FIL',
    category: 'Armor',
    rarity: 'Epic',
    stats: { attack: 10, defense: 80, speed: 100, health: 60 },
    isListed: true,
    createdAt: Date.now() - 604800000,
    updatedAt: Date.now() - 604800000,
    pieceCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  },
  {
    id: '8',
    name: '⚡ THUNDER BOOTS',
    description: 'Boots that allow lightning-fast movement',
    image: '⚡',
    price: '0.4 FIL',
    category: 'Accessory',
    rarity: 'Rare',
    stats: { attack: 20, defense: 15, speed: 120, health: 25 },
    isListed: true,
    createdAt: Date.now() - 691200000,
    updatedAt: Date.now() - 691200000,
    pieceCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  }
]

export default function Marketplace() {
  const [nfts, setNfts] = useState<NFT[]>(mockNFTs)
  const [filteredNFTs, setFilteredNFTs] = useState<NFT[]>(mockNFTs)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filters, setFilters] = useState({
    category: 'all',
    rarity: 'all',
    priceRange: [0, 1000]
  })
  const [isStorageInitialized, setIsStorageInitialized] = useState(false)
  const [storageStats, setStorageStats] = useState({
    totalStored: 0,
    totalSize: '0 MB'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null)

  // Initialize Synapse storage via API
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        console.log('🔍 Checking Synapse status via API...')
        const response = await fetch('/api/synapse/status')
        const result = await response.json()
        
        setIsStorageInitialized(result.isInitialized)
        
        if (result.isInitialized) {
          console.log('✅ Synapse storage initialized successfully via API')
          console.log('💰 Wallet:', result.walletAddress)
          console.log('💵 Balance:', result.balance)
        } else {
          console.log('⚠️ Synapse running in demo mode:', result.message)
        }
      } catch (error) {
        console.error('❌ Failed to initialize Synapse storage via API:', error)
        setIsStorageInitialized(false)
      }
    }

    initializeStorage()
  }, [])

  // Filter and search NFTs
  useEffect(() => {
    let filtered = nfts.filter(nft => {
      const matchesSearch = nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           nft.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = filters.category === 'all' || nft.category === filters.category
      const matchesRarity = filters.rarity === 'all' || nft.rarity === filters.rarity
      
      return matchesSearch && matchesCategory && matchesRarity
    })

    // Sort NFTs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return parseFloat(a.price) - parseFloat(b.price)
        case 'rarity':
          const rarityOrder = { 'Common': 1, 'Rare': 2, 'Epic': 3, 'Legendary': 4 }
          return rarityOrder[b.rarity as keyof typeof rarityOrder] - rarityOrder[a.rarity as keyof typeof rarityOrder]
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    setFilteredNFTs(filtered)
  }, [nfts, searchTerm, sortBy, filters])

  const handlePurchase = async (nft: NFT) => {
    try {
      setIsLoading(true)
      console.log(`🛒 Purchasing ${nft.name} for ${nft.price}`)
      
      // Show loading toast
      const loadingToast = toast.loading('🛒 PROCESSING PURCHASE...', {
        style: {
          background: '#1a1a1a',
          color: '#4A8C4A',
          border: '2px solid #4A8C4A',
        }
      })
      
      // Make real purchase request to API
      const response = await fetch('/api/synapse/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nftId: nft.id,
          nftName: nft.name,
          price: nft.price,
          buyerAddress: '0x798b32BDf86253060d598038b1D77C98C36881D6' // This would come from wallet connection
        })
      })

      const result = await response.json()
      
      // Dismiss loading toast
      toast.dismiss(loadingToast)
      
      if (result.success) {
        console.log('✅ Purchase successful:', result.transactionHash)
        toast.success(`🎉 SUCCESSFULLY PURCHASED ${nft.name.toUpperCase()} FOR ${nft.price}!`, {
          duration: 5000,
          style: {
            background: '#111111',
            color: '#4A8C4A',
            border: '2px solid #4A8C4A',
          }
        })
        
        // Show transaction details
        toast.success(`📋 TRANSACTION HASH: ${result.transactionHash}`, {
          duration: 8000,
          style: {
            background: '#111111',
            color: '#A259FF',
            border: '2px solid #A259FF',
          }
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('❌ Purchase failed:', error)
      toast.error(`❌ PURCHASE FAILED: ${error.message || 'Please try again'}`, {
        style: {
          background: '#111111',
          color: '#8B0000',
          border: '2px solid #8B0000',
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (nft: NFT) => {
    setSelectedNFT(nft)
    console.log(`👁️ Viewing details for ${nft.name}`)
  }

  const handleStoreAllNFTs = async () => {
    try {
      setIsLoading(true)
      console.log('📁 Storing all NFT metadata to Filecoin...')
      
      // Show loading toast
      const loadingToast = toast.loading('📁 STORING NFT METADATA TO FILECOIN...', {
        style: {
          background: '#1a1a1a',
          color: '#A259FF',
          border: '2px solid #A259FF',
        }
      })
      
      let storedCount = 0
      
      for (const nft of nfts) {
        if (!nft.pieceCid) {
          // Convert NFT to NFTMetadata format
          const nftMetadata: NFTMetadata = {
            id: nft.id,
            name: nft.name,
            description: nft.description,
            image: nft.image,
            price: parseFloat(nft.price), // Convert string to number
            rarity: nft.rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary',
            category: nft.category.toLowerCase() as 'character' | 'weapon' | 'accessory' | 'background',
            stats: {
              attack: nft.stats.attack,
              defense: nft.stats.defense,
              speed: nft.stats.speed,
              special: nft.stats.health
            },
            isListed: nft.isListed,
            createdAt: nft.createdAt,
            updatedAt: nft.updatedAt
          }
          
          // Store via API route
          const response = await fetch('/api/synapse/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nftMetadata })
          })

          const result = await response.json()
          
          if (result.success) {
            console.log(`✅ Stored ${nft.name} with PieceCID: ${result.pieceCid}`)
            storedCount++
          } else {
            console.error(`❌ Failed to store ${nft.name}:`, result.message)
          }
        }
      }
      
      setStorageStats(prev => ({
        totalStored: prev.totalStored + storedCount,
        totalSize: `${(prev.totalStored + storedCount) * 0.1} MB`
      }))
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast)
      toast.success(`🎉 SUCCESSFULLY STORED ${storedCount} NFT METADATA TO FILECOIN!`, {
        duration: 5000,
        style: {
          background: '#111111',
          color: '#A259FF',
          border: '2px solid #A259FF',
        }
      })
    } catch (error) {
      console.error('❌ Failed to store NFT metadata:', error)
      toast.error('❌ FAILED TO STORE NFT METADATA. PLEASE TRY AGAIN.', {
        style: {
          background: '#111111',
          color: '#8B0000',
          border: '2px solid #8B0000',
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedNFT(null)
  }

  return (
    <div className="min-h-screen gaming-bg text-white">
      {/* Header */}
      <div className="relative z-10 bg-[#111111]/95 backdrop-blur-sm border-b-2 border-[#2a2a2a] px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold font-press-start tracking-wider mb-3 sm:mb-4 md:mb-6 lg:mb-8">
              <span className="pixel-text-3d-green block sm:inline">PEPASUR</span>
              <span className="pixel-text-3d-white mx-0 sm:mx-2 md:mx-4 block sm:inline">MARKETPLACE</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-press-start pixel-text-3d-white leading-relaxed px-2 sm:px-4">
              UPGRADE YOUR CHARACTERS • COLLECT RARE ITEMS • DOMINATE THE GAME
            </p>
            
            {/* Storage Status */}
            <div className="mt-4 sm:mt-8 flex justify-center">
              <div className={`px-3 sm:px-6 py-2 sm:py-3 rounded-none border-2 font-press-start text-xs sm:text-sm ${
                isStorageInitialized 
                  ? 'bg-[#4A8C4A] border-[#4A8C4A] text-white' 
                  : 'bg-[#8B0000] border-[#8B0000] text-white'
              }`}>
                {isStorageInitialized ? '✅ SYNAPSE CONNECTED' : '⚠️ DEMO MODE'}
              </div>
            </div>
          </div>

          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 lg:gap-8 items-center justify-center">
            <div className="relative w-full sm:w-auto max-w-xs sm:max-w-none">
              <input
                type="text"
                placeholder="SEARCH ITEMS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 bg-[#1a1a1a] border-2 border-[#2a2a2a] text-white font-press-start text-xs sm:text-sm placeholder-gray-400 focus:border-[#4A8C4A] focus:outline-none pixel-input-focus"
              />
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 bg-[#1a1a1a] border-2 border-[#2a2a2a] text-white font-press-start text-xs sm:text-sm focus:border-[#4A8C4A] focus:outline-none"
            >
              <option value="name">SORT BY NAME</option>
              <option value="price">SORT BY PRICE</option>
              <option value="rarity">SORT BY RARITY</option>
            </select>

            <Button
              onClick={handleStoreAllNFTs}
              disabled={isLoading}
              variant="pixelPurple"
              size="pixelLarge"
              className="w-full sm:w-auto min-w-[140px]"
            >
              {isLoading ? '⏳ STORING...' : '📁 STORE ALL'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 md:gap-8 lg:gap-12">
            {/* Filters Sidebar */}
            <div className="lg:w-80 xl:w-96 order-2 lg:order-1">
              <MarketplaceFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>

            {/* NFT Grid */}
            <div className="flex-1 order-1 lg:order-2">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-press-start pixel-text-3d-white mb-4 sm:mb-6 md:mb-8">
                AVAILABLE ITEMS ({filteredNFTs.length})
              </h2>
              
              {filteredNFTs.length === 0 ? (
                <div className="text-center py-8 sm:py-12 md:py-16">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4">🔍</div>
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-press-start pixel-text-3d-white mb-3 sm:mb-4">
                    NO ITEMS FOUND
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-press-start text-gray-400">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                  {filteredNFTs.map((nft) => (
                    <NFTCard
                      key={nft.id}
                      nft={nft}
                      onPurchase={handlePurchase}
                      onViewDetails={handleViewDetails}
                      isLoading={isLoading}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NFT Details Modal */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[#111111] border-2 border-[#2a2a2a] p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-press-start pixel-text-3d-white pr-4">
                {selectedNFT.name}
              </h3>
              <button
                onClick={closeModal}
                className="text-xl sm:text-2xl hover:text-[#4A8C4A] transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-3 sm:mb-4 pixelated">
                  {selectedNFT.image}
                </div>
                <div className={`px-3 sm:px-4 py-1 sm:py-2 rounded-none border-2 font-press-start text-xs sm:text-sm inline-block ${
                  selectedNFT.rarity === 'Legendary' ? 'bg-[#A259FF] border-[#A259FF] text-white' :
                  selectedNFT.rarity === 'Epic' ? 'bg-[#4A8C4A] border-[#4A8C4A] text-white' :
                  selectedNFT.rarity === 'Rare' ? 'bg-[#00AAFF] border-[#00AAFF] text-white' :
                  'bg-[#CCCC00] border-[#CCCC00] text-black'
                }`}>
                  {selectedNFT.rarity.toUpperCase()}
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm md:text-base font-press-start text-gray-300 leading-relaxed">
                  {selectedNFT.description}
                </p>
                
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-sm sm:text-base md:text-lg font-press-start pixel-text-3d-white">STATS</h4>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-2 sm:p-3">
                      <div className="text-xs font-press-start text-gray-400">ATTACK</div>
                      <div className="text-sm sm:text-base md:text-lg font-press-start pixel-text-3d-red">{selectedNFT.stats.attack}</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-2 sm:p-3">
                      <div className="text-xs font-press-start text-gray-400">DEFENSE</div>
                      <div className="text-sm sm:text-base md:text-lg font-press-start pixel-text-3d-blue">{selectedNFT.stats.defense}</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-2 sm:p-3">
                      <div className="text-xs font-press-start text-gray-400">SPEED</div>
                      <div className="text-sm sm:text-base md:text-lg font-press-start pixel-text-3d-yellow">{selectedNFT.stats.speed}</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-2 sm:p-3">
                      <div className="text-xs font-press-start text-gray-400">HEALTH</div>
                      <div className="text-sm sm:text-base md:text-lg font-press-start pixel-text-3d-green">{selectedNFT.stats.health}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={() => handlePurchase(selectedNFT)}
                    disabled={isLoading}
                    variant="pixel"
                    size="pixelLarge"
                    className="flex-1"
                  >
                    {isLoading ? '⏳ PURCHASING...' : `🛒 BUY ${selectedNFT.price}`}
                  </Button>
                  <Button
                    onClick={closeModal}
                    variant="pixelOutline"
                    size="pixelLarge"
                    className="flex-1"
                  >
                    CLOSE
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}