import { NextRequest, NextResponse } from 'next/server'
import { pepasurStorage } from '../../../../services/synapse-storage'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Checking Synapse status...')
    
    // Initialize Synapse storage
    const result = await pepasurStorage.initialize()
    
    if (result.isInitialized) {
      // Setup payments if not already done
      await pepasurStorage.setupPayments()
      console.log('✅ API: Synapse initialized successfully')
    }
    
    return NextResponse.json({
      success: result.success,
      isInitialized: result.isInitialized,
      message: result.message,
      walletAddress: result.walletAddress,
      balance: result.balance
    })
  } catch (error) {
    console.error('❌ API: Failed to initialize Synapse:', error)
    return NextResponse.json({
      success: false,
      isInitialized: false,
      message: `Failed to initialize Synapse: ${error}`,
      walletAddress: null,
      balance: '0'
    }, { status: 500 })
  }
}
