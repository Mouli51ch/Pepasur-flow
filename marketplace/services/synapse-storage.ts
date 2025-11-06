import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

/**
 * NFT Metadata structure for Pepasur marketplace
 */
export interface NFTMetadata {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'character' | 'weapon' | 'accessory' | 'background';
  stats?: {
    attack?: number;
    defense?: number;
    speed?: number;
    special?: number;
  };
  owner?: string;
  isListed: boolean;
  createdAt: number;
  updatedAt: number;
  pieceCid?: string; // Synapse storage reference
  transactionHash?: string; // Blockchain transaction hash
}

/**
 * Synapse storage record structure
 */
export interface SynapseRecord {
  metadata: NFTMetadata;
  timestamp: number;
  hash: string;
  remarks: string;
  randyRatings: number;
}

/**
 * Pepasur Synapse Storage Service
 * Handles NFT metadata storage and retrieval using Filecoin via Synapse SDK
 */
export class PepasurSynapseStorage {
  private synapse: Synapse | null = null;
  private provider: ethers.WebSocketProvider | null = null;
  private isInitialized = false;

  /**
   * Initialize Synapse with private key and RPC URL
   */
  async initialize(): Promise<{
    success: boolean;
    message: string;
    walletAddress: string | null;
    balance: string;
    isInitialized: boolean;
  }> {
    if (this.isInitialized) {
      console.log('✅ Synapse already initialized');
      return {
        success: true,
        message: 'Synapse already initialized',
        walletAddress: null,
        balance: '0',
        isInitialized: true
      };
    }

    // Debug: Check if Next.js environment variables are loaded
    console.log('🔍 Next.js Environment check:');
    console.log('  PRIVATE_KEY loaded:', process.env.PRIVATE_KEY ? 'Yes (hidden for security)' : 'No');
    console.log('  WS_RPC_URL loaded:', process.env.WS_RPC_URL ? 'Yes' : 'No');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    
    // Check for private key in Next.js environment
    let privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      console.warn('⚠️ No PRIVATE_KEY found in environment.');
      console.log('📋 For full Synapse functionality, create a .env file with:');
      console.log('   PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE');
      console.log('   WS_RPC_URL=https://api.calibration.node.glif.io/rpc/v1');
      console.log('🔄 Running in demo mode without Synapse integration...');
      
      // Return a mock initialization for demo purposes
      this.synapse = null;
      return {
        success: false,
        message: 'Running in demo mode - Synapse not initialized',
        walletAddress: null,
        balance: '0',
        isInitialized: false
      };
    }

    const rpcUrl = process.env.WS_RPC_URL || RPC_URLS.calibration.http;

    console.log('Initializing Synapse for Pepasur Marketplace...');
    console.log('RPC:', rpcUrl);
    console.log('Chain ID: 314159 (Calibration testnet)');
    console.log('Token: tFIL (test FIL)');

    try {
      // Initialize Synapse with simplified API (v0.24.0+)
      this.synapse = await Synapse.create({
        privateKey,
        rpcURL: rpcUrl,
      });

      // Get wallet address for user information
      const provider = this.synapse.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const walletAddress = await wallet.getAddress();
      console.log('Wallet address:', walletAddress);
      console.log('✅ Synapse initialized successfully for Pepasur Marketplace');
      
      this.isInitialized = true;
      
      return {
        success: true,
        message: 'Synapse initialized successfully',
        walletAddress: walletAddress,
        balance: '0', // Will be updated by setupPayments
        isInitialized: true
      };
    } catch (error) {
      console.error('❌ Failed to initialize Synapse:', error);
      return {
        success: false,
        message: `Failed to initialize Synapse: ${error}`,
        walletAddress: null,
        balance: '0',
        isInitialized: false
      };
    }
  }

  /**
   * Set up payments for storage using tFIL tokens
   */
  async setupPayments(): Promise<void> {
    if (!this.synapse) {
      console.log('🔄 Synapse not initialized - skipping payment setup (demo mode)');
      return;
    }

    console.log('Setting up payments for NFT metadata storage...');
    
    try {
      // Check wallet tFIL balance first
      const walletBalance = await this.synapse.payments.walletBalance();
      console.log('Wallet tFIL balance:', ethers.formatEther(walletBalance), 'tFIL');
      
      // Check if we have enough tFIL for storage operations
      const minRequiredtFIL = ethers.parseUnits('1', 18); // 1 tFIL minimum
      if (walletBalance < minRequiredtFIL) {
        throw new Error(`Insufficient tFIL balance. Need at least ${ethers.formatEther(minRequiredtFIL)} tFIL for storage operations.`);
      }
      
      console.log('✅ Sufficient tFIL balance available for NFT metadata storage');
      
      // Check USDFC balance in payments contract
      const usdfcBalance = await this.synapse.payments.balance();
      console.log('Current USDFC balance in payments contract:', ethers.formatEther(usdfcBalance), 'USDFC');
      
      // Check if we need more USDFC
      const requiredUSDFC = ethers.parseUnits('5', 18); // 5 USDFC for NFT storage
      if (usdfcBalance < requiredUSDFC) {
        const neededAmount = requiredUSDFC - usdfcBalance;
        console.log(`Need ${ethers.formatEther(neededAmount)} more USDFC. Depositing...`);
        
        try {
          const depositTx = await this.synapse.payments.deposit(neededAmount);
          console.log('Deposit transaction:', depositTx.hash);
          console.log('Waiting for confirmation...');
          await depositTx.wait();
          console.log('✅ USDFC deposit confirmed');
        } catch (error: any) {
          console.error('Deposit failed. Proceeding with current balance...');
        }
      } else {
        console.log('✅ Sufficient USDFC balance already available');
      }
      
      // Approve the Warm Storage service to use USDFC tokens
      const warmStorageAddress = await this.synapse.getWarmStorageAddress();
      console.log('Approving Warm Storage service for NFT metadata storage...');
      
      const approveTx = await this.synapse.payments.approveService(
        warmStorageAddress,
        ethers.parseUnits('1', 18),    // Rate allowance: 1 USDFC per epoch
        ethers.parseUnits('9', 18),    // Lockup allowance: 9 USDFC total
        86400n                         // Max lockup period: 30 days
      );
      console.log('Service approval transaction:', approveTx.hash);
      console.log('Waiting for confirmation...');
      await approveTx.wait();
      console.log('✅ Service approval confirmed');
      
      console.log('🎉 Payment setup complete! Ready for NFT metadata storage.');
      
    } catch (error: any) {
      console.error('Payment setup failed:', error);
      throw error;
    }
  }

  /**
   * Store NFT metadata to Filecoin via Synapse
   */
  async storeNFTMetadata(nftMetadata: NFTMetadata): Promise<string> {
    if (!this.synapse) {
      console.log('🔄 Synapse not initialized - returning mock PieceCID (demo mode)');
      // Return a mock PieceCID for demo purposes
      return `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`;
    }

    const record: SynapseRecord = {
      metadata: {
        ...nftMetadata,
        createdAt: nftMetadata.createdAt || Date.now(),
        updatedAt: Date.now()
      },
      timestamp: Date.now(),
      hash: nftMetadata.id, // Use NFT ID as hash
      remarks: `Pepasur NFT: ${nftMetadata.name} - ${nftMetadata.rarity} ${nftMetadata.category}`,
      randyRatings: this.getRarityRating(nftMetadata.rarity)
    };

    console.log('Storing NFT metadata to Filecoin:', nftMetadata.name);

    try {
      // Convert JSON to Uint8Array
      const jsonString = JSON.stringify(record);
      const data = new TextEncoder().encode(jsonString);

      console.log('NFT metadata size:', data.length, 'bytes');

      // Upload using simplified API
      console.log('Uploading NFT metadata to Filecoin...');
      const result = await this.synapse.storage.upload(data);
      
      const pieceCid = result.pieceCid.toString();
      console.log('✅ NFT metadata uploaded! PieceCID:', pieceCid);
      
      return pieceCid;
    } catch (error) {
      console.error('❌ NFT metadata upload failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve NFT metadata from Filecoin via Synapse
   */
  async retrieveNFTMetadata(pieceCid: string): Promise<NFTMetadata> {
    if (!this.synapse) {
      console.log('🔄 Synapse not initialized - returning mock metadata (demo mode)');
      // Return mock metadata for demo purposes
      return {
        id: 'demo-nft',
        name: 'Demo NFT',
        description: 'This is a demo NFT for testing purposes',
        image: '🎮',
        price: 1000,
        rarity: 'common',
        category: 'character',
        isListed: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pieceCid: pieceCid
      };
    }

    console.log('Retrieving NFT metadata for PieceCID:', pieceCid);

    try {
      // Download using simplified API
      const data = await this.synapse.storage.download(pieceCid);
      
      // Convert back to JSON
      const jsonString = new TextDecoder().decode(data);
      const record = JSON.parse(jsonString) as SynapseRecord;
      
      console.log('✅ NFT metadata retrieved:', record.metadata.name);
      return record.metadata;
    } catch (error) {
      console.error('❌ NFT metadata retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Update existing NFT metadata
   */
  async updateNFTMetadata(pieceCid: string, updatedMetadata: Partial<NFTMetadata>): Promise<string> {
    if (!this.synapse) {
      throw new Error('Synapse not initialized. Call initialize() first.');
    }

    try {
      // Retrieve existing metadata
      const existingMetadata = await this.retrieveNFTMetadata(pieceCid);
      
      // Merge with updates
      const mergedMetadata: NFTMetadata = {
        ...existingMetadata,
        ...updatedMetadata,
        updatedAt: Date.now()
      };

      // Store updated metadata (creates new PieceCID)
      const newPieceCid = await this.storeNFTMetadata(mergedMetadata);
      
      console.log('✅ NFT metadata updated. New PieceCID:', newPieceCid);
      return newPieceCid;
    } catch (error) {
      console.error('❌ NFT metadata update failed:', error);
      throw error;
    }
  }

  /**
   * Get rarity rating for Synapse storage
   */
  private getRarityRating(rarity: string): number {
    const ratings = {
      'common': 1,
      'rare': 2,
      'epic': 3,
      'legendary': 5
    };
    return ratings[rarity as keyof typeof ratings] || 1;
  }

  /**
   * Batch store multiple NFT metadata
   */
  async batchStoreNFTMetadata(nftMetadataList: NFTMetadata[]): Promise<string[]> {
    console.log(`Batch storing ${nftMetadataList.length} NFT metadata records...`);
    
    const pieceCids: string[] = [];
    
    for (const nftMetadata of nftMetadataList) {
      try {
        const pieceCid = await this.storeNFTMetadata(nftMetadata);
        pieceCids.push(pieceCid);
        console.log(`✅ Stored ${nftMetadata.name}: ${pieceCid}`);
      } catch (error) {
        console.error(`❌ Failed to store ${nftMetadata.name}:`, error);
        throw error;
      }
    }
    
    console.log(`🎉 Successfully batch stored ${pieceCids.length} NFT metadata records`);
    return pieceCids;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    walletBalance: string;
    usdfcBalance: string;
    isInitialized: boolean;
  }> {
    if (!this.synapse) {
      return {
        walletBalance: '0',
        usdfcBalance: '0',
        isInitialized: false
      };
    }

    try {
      const walletBalance = await this.synapse.payments.walletBalance();
      const usdfcBalance = await this.synapse.payments.balance();
      
      return {
        walletBalance: ethers.formatEther(walletBalance),
        usdfcBalance: ethers.formatEther(usdfcBalance),
        isInitialized: this.isInitialized
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        walletBalance: '0',
        usdfcBalance: '0',
        isInitialized: this.isInitialized
      };
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.synapse) {
      const provider = this.synapse.getProvider();
      if (provider && typeof provider.destroy === 'function') {
        await provider.destroy();
        console.log('Provider connection closed');
      }
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const pepasurStorage = new PepasurSynapseStorage();
