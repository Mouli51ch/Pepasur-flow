#!/usr/bin/env node

/**
 * Pepasur Marketplace - Basic Setup Test Script
 * 
 * This script tests the basic setup without Synapse SDK
 * Run with: node scripts/test-basic.js
 */

const fs = require('fs');
const path = require('path');

function testBasicSetup() {
  console.log('🎮 Pepasur Marketplace - Basic Setup Test');
  console.log('=========================================\n');

  let allTestsPassed = true;

  // Test 1: Check if we're in the right directory
  console.log('📋 Test 1: Checking directory structure...');
  const requiredFiles = [
    'package.json',
    'env.example',
    'components/nft-card.tsx',
    'pages/marketplace.tsx',
    'services/synapse-storage.ts'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - Missing`);
      allTestsPassed = false;
    }
  });

  // Test 2: Check package.json
  console.log('\n📋 Test 2: Checking package.json...');
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    console.log(`   ✅ Package name: ${packageJson.name}`);
    console.log(`   ✅ Version: ${packageJson.version}`);
    
    // Check for required dependencies
    const requiredDeps = ['@filoz/synapse-sdk', 'ethers', 'dotenv'];
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        console.log(`   ❌ ${dep} - Missing from dependencies`);
        allTestsPassed = false;
      }
    });
  } catch (error) {
    console.log(`   ❌ Failed to read package.json: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 3: Check environment setup
  console.log('\n📋 Test 3: Checking environment setup...');
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('   ✅ env.example exists');
  } else {
    console.log('   ❌ env.example missing');
    allTestsPassed = false;
  }

  if (fs.existsSync(envPath)) {
    console.log('   ✅ .env file exists');
    
    // Check if .env has been configured
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('0xYOUR_PRIVATE_KEY_HERE')) {
      console.log('   ⚠️  .env file needs configuration (private key)');
    } else if (envContent.includes('PRIVATE_KEY=0x')) {
      console.log('   ✅ .env file appears to be configured');
    } else {
      console.log('   ⚠️  .env file may need configuration');
    }
  } else {
    console.log('   ⚠️  .env file missing (run npm run setup)');
  }

  // Test 4: Check node_modules
  console.log('\n📋 Test 4: Checking dependencies...');
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('   ✅ node_modules exists');
    
    // Check for specific packages
    const packagesToCheck = ['@filoz/synapse-sdk', 'ethers', 'dotenv'];
    packagesToCheck.forEach(pkg => {
      const pkgPath = path.join(nodeModulesPath, pkg);
      if (fs.existsSync(pkgPath)) {
        console.log(`   ✅ ${pkg} installed`);
      } else {
        console.log(`   ❌ ${pkg} not installed`);
        allTestsPassed = false;
      }
    });
  } else {
    console.log('   ❌ node_modules missing (run npm install)');
    allTestsPassed = false;
  }

  // Test 5: Check TypeScript configuration
  console.log('\n📋 Test 5: Checking TypeScript configuration...');
  const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    console.log('   ✅ tsconfig.json exists');
  } else {
    console.log('   ❌ tsconfig.json missing');
    allTestsPassed = false;
  }

  // Test Summary
  console.log('\n📊 Test Results:');
  console.log('================');
  if (allTestsPassed) {
    console.log('🎉 All basic tests passed!');
    console.log('\n🚀 Next steps:');
    console.log('1. Configure your .env file with a private key');
    console.log('2. Get test tokens from: https://faucet.calibration.fildev.network/');
    console.log('3. Run: npm run test-synapse');
    console.log('4. Run: npm run dev');
  } else {
    console.log('❌ Some tests failed. Please fix the issues above.');
    console.log('\n🔧 Common fixes:');
    console.log('1. Run: npm install');
    console.log('2. Run: npm run setup');
    console.log('3. Check your .env file configuration');
  }

  return allTestsPassed;
}

// Run the test
if (require.main === module) {
  testBasicSetup();
}

module.exports = { testBasicSetup };
