#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎮 Pepasur Marketplace - Environment Setup');
console.log('==========================================\n');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  console.log('📝 Current .env file location:', envPath);
  console.log('🔧 To modify it, edit the file directly or delete it to recreate\n');
} else {
  console.log('📋 Creating .env file from template...');
  
  if (fs.existsSync(envExamplePath)) {
    // Copy env.example to .env
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
  } else {
    // Create a basic .env file
    const basicEnvContent = `# Pepasur Marketplace - Synapse SDK Configuration
# Copy this file to .env and fill in your values

# Required: Private key for Filecoin wallet (Calibration testnet)
# Get test tokens from: https://faucet.calibration.fildev.network/
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Optional: WebSocket RPC URL (defaults to Calibration testnet)
WS_RPC_URL=https://api.calibration.node.glif.io/rpc/v1

# Optional: Chain ID (defaults to 314159 for Calibration)
CHAIN_ID=314159

# Optional: Storage configuration
STORAGE_PROVIDER=warm
STORAGE_DURATION=86400

# Optional: Payment configuration
MIN_TFIL_BALANCE=1.0
MIN_USDFC_BALANCE=5.0

# Optional: Debug mode
DEBUG=true
LOG_LEVEL=info

# Optional: API endpoints (for future integration)
MARKETPLACE_API_URL=https://api.pepasur.game
FLOW_RPC_URL=https://rest-testnet.onflow.org
`;
    fs.writeFileSync(envPath, basicEnvContent);
    console.log('✅ Basic .env file created successfully!');
  }
}

console.log('\n📖 Next Steps:');
console.log('1. Edit the .env file and add your private key');
console.log('2. Get test tokens from: https://faucet.calibration.fildev.network/');
console.log('3. Restart the marketplace server');
console.log('\n💡 Note: The marketplace works in demo mode without a private key');
console.log('   but you need one for full Synapse integration.\n');

console.log('🚀 To start the marketplace:');
console.log('   npm run dev\n');
