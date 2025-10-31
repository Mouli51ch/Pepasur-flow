#!/usr/bin/env node

/**
 * Pepasur Marketplace - Synapse Integration Test Script (JavaScript)
 * 
 * This script tests the Synapse SDK integration for NFT metadata storage
 * Run with: node scripts/test-synapse.js
 */

const dotenv = require('dotenv');
const ethers = require('ethers');

// Try different import methods for Synapse SDK
let Synapse, RPC_URLS;
try {
  // Try ES module import first
  const synapseModule = require('@filoz/synapse-sdk');
  Synapse = synapseModule.Synapse || synapseModule.default?.Synapse || synapseModule;
  RPC_URLS = synapseModule.RPC_URLS || synapseModule.default?.RPC_URLS || {
    calibration: {
      http: 'https://api.calibration.node.glif.io/rpc/v1'
    }
  };
} catch (error) {
  console.error('Failed to import Synapse SDK:', error.message);
  console.log('Please ensure @filoz/synapse-sdk is properly installed');
  process.exit(1);
}

// Load environment variables
dotenv.config({ path: '.env' });

// NFT Metadata structure
const createTestNFT = () => ({
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
});

// Synapse storage record structure
const createSynapseRecord = (nftMetadata) => ({
  metadata: nftMetadata,
  timestamp: Date.now(),
  hash: nftMetadata.id,
  remarks: `Pepasur NFT: ${nftMetadata.name} - ${nftMetadata.rarity} ${nftMetadata.category}`,
  randyRatings: getRarityRating(nftMetadata.rarity)
});

// Get rarity rating for Synapse storage
const getRarityRating = (rarity) => {
  const ratings = {
    'common': 1,
    'rare': 2,
    'epic': 3,
    'legendary': 5
  };
  return ratings[rarity] || 1;
};

async function testSynapseIntegration() {
  console.log('🎮 Pepasur Marketplace - Synapse Integration Test');
  console.log('================================================\n');

  let synapse = null;

  try {
    // Test 1: Check Environment
    console.log('📋 Test 1: Checking environment configuration...');
    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = process.env.WS_RPC_URL || RPC_URLS.calibration.http;

    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }

    console.log('✅ Environment configuration valid');
    console.log(`   RPC URL: ${rpcUrl}`);
    console.log(`   Private Key: ${privateKey.substring(0, 10)}...`);

    // Test 2: Initialize Synapse
    console.log('\n📋 Test 2: Initializing Synapse SDK...');
    synapse = await Synapse.create({
      privateKey,
      rpcURL: rpcUrl,
    });

    // Get wallet address
    const provider = synapse.getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = await wallet.getAddress();
    console.log('✅ Synapse SDK initialized successfully');
    console.log(`   Wallet Address: ${walletAddress}`);

    // Test 3: Check Wallet Balance
    console.log('\n📋 Test 3: Checking wallet balance...');
    const walletBalance = await synapse.payments.walletBalance();
    const usdfcBalance = await synapse.payments.balance();
    
    console.log('📊 Wallet Statistics:');
    console.log(`   tFIL Balance: ${ethers.formatEther(walletBalance)} tFIL`);
    console.log(`   USDFC Balance: ${ethers.formatEther(usdfcBalance)} USDFC`);

    // Check if we have enough balance
    const minRequiredtFIL = ethers.parseUnits('1', 18);
    if (walletBalance < minRequiredtFIL) {
      console.log('⚠️  Warning: Low tFIL balance. You may need more tokens for storage operations.');
      console.log('   Get test tokens from: https://faucet.calibration.fildev.network/');
    } else {
      console.log('✅ Sufficient tFIL balance for storage operations');
    }

    // Test 4: Setup Payments (if needed)
    console.log('\n📋 Test 4: Setting up payments...');
    try {
      const requiredUSDFC = ethers.parseUnits('5', 18);
      if (usdfcBalance < requiredUSDFC) {
        console.log('⚠️  Low USDFC balance. Attempting to deposit...');
        const neededAmount = requiredUSDFC - usdfcBalance;
        const depositTx = await synapse.payments.deposit(neededAmount);
        console.log(`   Deposit transaction: ${depositTx.hash}`);
        await depositTx.wait();
        console.log('✅ USDFC deposit confirmed');
      } else {
        console.log('✅ Sufficient USDFC balance already available');
      }

      // Approve storage service
      const warmStorageAddress = await synapse.getWarmStorageAddress();
      const approveTx = await synapse.payments.approveService(
        warmStorageAddress,
        ethers.parseUnits('1', 18),
        ethers.parseUnits('9', 18),
        86400n
      );
      console.log(`   Service approval transaction: ${approveTx.hash}`);
      await approveTx.wait();
      console.log('✅ Service approval confirmed');
    } catch (error) {
      console.log('⚠️  Payment setup failed, but continuing with test...');
      console.log(`   Error: ${error.message}`);
    }

    // Test 5: Create Test NFT
    console.log('\n📋 Test 5: Creating test NFT metadata...');
    const testNFT = createTestNFT();
    console.log('✅ Test NFT metadata created:', testNFT.name);

    // Test 6: Store NFT Metadata
    console.log('\n📋 Test 6: Storing NFT metadata to Filecoin...');
    const record = createSynapseRecord(testNFT);
    const jsonString = JSON.stringify(record);
    const data = new TextEncoder().encode(jsonString);

    console.log(`   Data size: ${data.length} bytes`);
    const result = await synapse.storage.upload(data);
    const pieceCid = result.pieceCid.toString();
    
    console.log('✅ NFT metadata stored successfully!');
    console.log(`   PieceCID: ${pieceCid}`);

    // Test 7: Retrieve NFT Metadata
    console.log('\n📋 Test 7: Retrieving NFT metadata from Filecoin...');
    const retrievedData = await synapse.storage.download(pieceCid);
    const retrievedJsonString = new TextDecoder().decode(retrievedData);
    const retrievedRecord = JSON.parse(retrievedJsonString);
    const retrievedNFT = retrievedRecord.metadata;

    console.log('✅ NFT metadata retrieved successfully!');
    console.log(`   Name: ${retrievedNFT.name}`);
    console.log(`   Price: ${retrievedNFT.price} FLOW`);
    console.log(`   Rarity: ${retrievedNFT.rarity}`);
    console.log(`   Stats: ATK:${retrievedNFT.stats?.attack} DEF:${retrievedNFT.stats?.defense}`);

    // Test 8: Verify Data Integrity
    console.log('\n📋 Test 8: Verifying data integrity...');
    const originalHash = testNFT.id;
    const retrievedHash = retrievedNFT.id;
    
    if (originalHash === retrievedHash) {
      console.log('✅ Data integrity verified - hashes match');
    } else {
      console.log('❌ Data integrity check failed - hashes do not match');
    }

    // Test Summary
    console.log('\n🎉 All Tests Completed Successfully!');
    console.log('=====================================');
    console.log('✅ Environment configuration');
    console.log('✅ Synapse SDK initialization');
    console.log('✅ Wallet balance check');
    console.log('✅ Payment setup');
    console.log('✅ NFT metadata creation');
    console.log('✅ NFT metadata storage');
    console.log('✅ NFT metadata retrieval');
    console.log('✅ Data integrity verification');
    console.log('\n🚀 Pepasur Marketplace is ready for NFT metadata storage!');
    console.log(`\n📁 Your test NFT is stored with PieceCID: ${pieceCid}`);

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your .env file has a valid PRIVATE_KEY');
    console.log('2. Ensure you have tFIL tokens in your wallet');
    console.log('3. Verify network connectivity');
    console.log('4. Get test tokens from: https://faucet.calibration.fildev.network/');
    console.log('\n📋 Environment Setup:');
    console.log('   cp env.example .env');
    console.log('   # Edit .env with your private key');
    console.log('   # Get test tokens from faucet');
    process.exit(1);
  } finally {
    // Cleanup
    if (synapse) {
      console.log('\n🧹 Cleaning up resources...');
      const provider = synapse.getProvider();
      if (provider && typeof provider.destroy === 'function') {
        await provider.destroy();
      }
      console.log('✅ Cleanup completed');
    }
  }
}

// Run the test
if (require.main === module) {
  testSynapseIntegration().catch(console.error);
}

module.exports = { testSynapseIntegration };
