import { NextRequest, NextResponse } from 'next/server'
import { pepasurStorage, NFTMetadata } from '../../../../services/synapse-storage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nftMetadata } = body

    console.log('📁 API: Storing NFT metadata...')
    console.log('   NFT Name:', nftMetadata.name)
    console.log('   NFT ID:', nftMetadata.id)

    // Initialize Synapse if not already done
    const initResult = await pepasurStorage.initialize()
    if (!initResult.isInitialized) {
      return NextResponse.json({
        success: false,
        message: 'Synapse not initialized',
        pieceCid: null
      }, { status: 500 })
    }

    // Setup payments if needed
    await pepasurStorage.setupPayments()

    // Store the NFT metadata
    const pieceCid = await pepasurStorage.storeNFTMetadata(nftMetadata)
    
    console.log('✅ API: NFT metadata stored successfully')
    console.log('   PieceCID:', pieceCid)

    return NextResponse.json({
      success: true,
      message: 'NFT metadata stored successfully',
      pieceCid,
      nftId: nftMetadata.id,
      nftName: nftMetadata.name
    })

  } catch (error) {
    console.error('❌ API: Failed to store NFT metadata:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to store NFT metadata: ${error}`,
      pieceCid: null
    }, { status: 500 })
  }
}
