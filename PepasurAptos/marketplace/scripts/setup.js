#!/usr/bin/env node

/**
 * Pepasur Marketplace - Setup Script
 * 
 * This script helps set up the marketplace environment
 * Run with: node scripts/setup.js
 */

const fs = require('fs');
const path = require('path');

function setupMarketplace() {
  console.log('🎮 Pepasur Marketplace Setup');
  console.log('============================\n');

  // Check if .env file exists
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', 'env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      console.log('📋 Creating .env file from template...');
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env file created');
      console.log('⚠️  Please edit .env file with your private key');
    } else {
      console.log('❌ env.example file not found');
      return;
    }
  } else {
    console.log('✅ .env file already exists');
  }

  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('\n📋 Installing dependencies...');
    console.log('   Run: npm install');
  } else {
    console.log('✅ Dependencies already installed');
  }

  // Display setup instructions
  console.log('\n🚀 Setup Instructions:');
  console.log('======================');
  console.log('1. Edit .env file with your private key:');
  console.log('   PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE');
  console.log('');
  console.log('2. Get test tokens from Calibration faucet:');
  console.log('   https://faucet.calibration.fildev.network/');
  console.log('');
  console.log('3. Install dependencies (if not already done):');
  console.log('   npm install');
  console.log('');
  console.log('4. Test Synapse integration:');
  console.log('   npm run test-synapse');
  console.log('');
  console.log('5. Run the marketplace:');
  console.log('   npm run dev');
  console.log('');
  console.log('📚 For more information, see:');
  console.log('   - SYNAPSE_INTEGRATION.md');
  console.log('   - README.md');

  // Check .env content
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('0xYOUR_PRIVATE_KEY_HERE')) {
      console.log('\n⚠️  Remember to update your private key in .env file!');
    } else if (envContent.includes('PRIVATE_KEY=0x')) {
      console.log('\n✅ Private key appears to be configured');
    }
  }
}

// Run setup
if (require.main === module) {
  setupMarketplace();
}

module.exports = { setupMarketplace };
