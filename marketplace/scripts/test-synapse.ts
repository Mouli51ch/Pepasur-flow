#!/usr/bin/env ts-node

/**
 * Pepasur Marketplace - Synapse Integration Test Script
 * 
 * This script tests the Synapse SDK integration for NFT metadata storage
 * Run with: npx ts-node scripts/test-synapse.ts
 */

import * as dotenv from 'dotenv';
import { pepasurStorage, NFTMetadata } from '../services/synapse-storage';

// Load environment variables
dotenv.config({ path: '.env' });

async function testSynapseIntegration(): Promise<void> {
  console.log('🎮 Pepasur Marketplace - Synapse Integration Test');
  console.log('================================================\n');

  try {
    // Test 1: Initialize Synapse
    console.log('📋 Test 1: Initializing Synapse SDK...');
    await pepasurStorage.initialize();
    console.log('✅ Synapse SDK initialized successfully\n');

    // Test 2: Setup Payments
    console.log('📋 Test 2: Setting up payments...');
    await pepasurStorage.setupPayments();
    console.log('✅ Payments setup completed\n');

    // Test 3: Get Storage Stats
    console.log('📋 Test 3: Getting storage statistics...');
    const stats = await pepasurStorage.getStorageStats();
    console.log('📊 Storage Statistics:');
    console.log(`   Wallet Balance: ${stats.walletBalance} tFIL`);
    console.log(`   USDFC Balance: ${stats.usdfcBalance} USDFC`);
    console.log(`   Initialized: ${stats.isInitialized}`);
    console.log('✅ Storage statistics retrieved\n');

    // Test 4: Create Test NFT Metadata
    console.log('📋 Test 4: Creating test NFT metadata...');
    const testNFT: NFTMetadata = {
      id: `test-nft-${Date.now()}`,
      name: 'TEST PEPE DETECTIVE',
      description: 'A test NFT for Synapse integration verification',
      image: '🕵️',
      price: 1000,
      rarity: 'rare',
      category: 'character',
      stats: {
        attack: 10,
        defense: 8,
        speed: 6,
        special: 12
      },
      isListed: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    console.log('✅ Test NFT metadata created:', testNFT.name);

    // Test 5: Store NFT Metadata
    console.log('\n📋 Test 5: Storing NFT metadata to Filecoin...');
    const pieceCid = await pepasurStorage.storeNFTMetadata(testNFT);
    console.log('✅ NFT metadata stored successfully!');
    console.log(`   PieceCID: ${pieceCid}`);

    // Test 6: Retrieve NFT Metadata
    console.log('\n📋 Test 6: Retrieving NFT metadata from Filecoin...');
    const retrievedNFT = await pepasurStorage.retrieveNFTMetadata(pieceCid);
    console.log('✅ NFT metadata retrieved successfully!');
    console.log(`   Name: ${retrievedNFT.name}`);
    console.log(`   Price: ${retrievedNFT.price} FLOW`);
    console.log(`   Rarity: ${retrievedNFT.rarity}`);
    console.log(`   Stats: ATK:${retrievedNFT.stats?.attack} DEF:${retrievedNFT.stats?.defense}`);

    // Test 7: Update NFT Metadata
    console.log('\n📋 Test 7: Updating NFT metadata...');
    const updatedNFT = await pepasurStorage.updateNFTMetadata(pieceCid, {
      price: 1500,
      stats: { ...retrievedNFT.stats, attack: 15 }
    });
    console.log('✅ NFT metadata updated successfully!');
    console.log(`   New PieceCID: ${updatedNFT}`);

    // Test 8: Batch Store Multiple NFTs
    console.log('\n📋 Test 8: Batch storing multiple NFTs...');
    const batchNFTs: NFTMetadata[] = [
      {
        id: `batch-nft-1-${Date.now()}`,
        name: 'BATCH PEPE WEAPON',
        description: 'A test weapon NFT',
        image: '🔫',
        price: 2000,
        rarity: 'epic',
        category: 'weapon',
        stats: { attack: 20, defense: 0, speed: 8, special: 25 },
        isListed: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: `batch-nft-2-${Date.now()}`,
        name: 'BATCH PEPE ACCESSORY',
        description: 'A test accessory NFT',
        image: '🎩',
        price: 800,
        rarity: 'common',
        category: 'accessory',
        stats: { attack: 2, defense: 5, speed: 3, special: 8 },
        isListed: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    const batchPieceCids = await pepasurStorage.batchStoreNFTMetadata(batchNFTs);
    console.log('✅ Batch storage completed successfully!');
    console.log(`   Stored ${batchPieceCids.length} NFTs`);
    batchPieceCids.forEach((cid, index) => {
      console.log(`   NFT ${index + 1}: ${cid}`);
    });

    // Test 9: Verify Batch Retrieval
    console.log('\n📋 Test 9: Verifying batch retrieval...');
    for (let i = 0; i < batchPieceCids.length; i++) {
      const retrieved = await pepasurStorage.retrieveNFTMetadata(batchPieceCids[i]);
      console.log(`   ✅ Retrieved: ${retrieved.name} (${retrieved.category})`);
    }

    // Test Summary
    console.log('\n🎉 All Tests Completed Successfully!');
    console.log('=====================================');
    console.log('✅ Synapse SDK initialization');
    console.log('✅ Payment setup');
    console.log('✅ Storage statistics');
    console.log('✅ Single NFT storage');
    console.log('✅ NFT metadata retrieval');
    console.log('✅ NFT metadata update');
    console.log('✅ Batch NFT storage');
    console.log('✅ Batch retrieval verification');
    console.log('\n🚀 Pepasur Marketplace is ready for NFT metadata storage!');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your .env file has a valid PRIVATE_KEY');
    console.log('2. Ensure you have tFIL tokens in your wallet');
    console.log('3. Verify network connectivity');
    console.log('4. Check console logs for detailed error information');
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up resources...');
    await pepasurStorage.cleanup();
    console.log('✅ Cleanup completed');
  }
}

// Run the test
if (require.main === module) {
  testSynapseIntegration().catch(console.error);
}

export { testSynapseIntegration };
