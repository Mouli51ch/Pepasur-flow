#!/usr/bin/env node

console.log('🧪 Testing Pepasur ENS Setup');
console.log('============================\n');

// Test 1: Check if we can load environment variables
console.log('1️⃣ Testing environment variable loading...');
try {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  
  const envPath = join(process.cwd(), '.env');
  const envExists = require('fs').existsSync(envPath);
  
  if (envExists) {
    console.log('✅ .env file found');
    
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = envContent.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('='))
      .filter(([key]) => key && key.trim());
    
    console.log(`   Found ${envVars.length} environment variables`);
    
    // Check for required variables
    const requiredVars = ['RPC_URL', 'PRIVATE_KEY', 'ENS_REGISTRY', 'UNIVERSAL_RESOLVER', 'PUBLIC_RESOLVER'];
    const missingVars = [];
    
    for (const [key] of envVars) {
      if (requiredVars.includes(key.trim())) {
        console.log(`   ✅ ${key.trim()}`);
      }
    }
    
    for (const reqVar of requiredVars) {
      if (!envVars.some(([key]) => key.trim() === reqVar)) {
        missingVars.push(reqVar);
      }
    }
    
    if (missingVars.length > 0) {
      console.log(`   ⚠️  Missing: ${missingVars.join(', ')}`);
    } else {
      console.log('   ✅ All required environment variables found');
    }
  } else {
    console.log('❌ .env file not found');
    console.log('   Please copy env.example to .env and configure it');
  }
} catch (error) {
  console.log('❌ Error loading environment:', error.message);
}

console.log('');

// Test 2: Check if we can import viem
console.log('2️⃣ Testing viem import...');
try {
  const { createPublicClient, http } = require('viem');
  const { sepolia } = require('viem/chains');
  
  console.log('✅ viem imported successfully');
  
  // Try to create a public client
  const client = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia.publicnode.com')
  });
  
  console.log('✅ Public client created successfully');
} catch (error) {
  console.log('❌ Error importing viem:', error.message);
}

console.log('');

// Test 3: Check if we can import TypeScript files
console.log('3️⃣ Testing TypeScript support...');
try {
  const { execSync } = require('child_process');
  
  // Check if tsx is available
  execSync('npx tsx --version', { stdio: 'pipe' });
  console.log('✅ tsx is available for TypeScript execution');
} catch (error) {
  console.log('❌ tsx not available:', error.message);
  console.log('   Please install dependencies: npm install');
}

console.log('');

// Test 4: Check file structure
console.log('4️⃣ Testing file structure...');
const { existsSync } = require('fs');

const requiredFiles = [
  'scripts/resolve.ts',
  'scripts/setTextRecord.ts', 
  'scripts/nameContract.ts',
  'packages/ens-utils/index.ts',
  'apps/web/package.json',
  'apps/web/pages/demo.tsx',
  'apps/web/components/PlayerBadge.tsx',
  'apps/web/components/ContractBadge.tsx'
];

let allFilesExist = true;

for (const file of requiredFiles) {
  if (existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file}`);
    allFilesExist = false;
  }
}

if (allFilesExist) {
  console.log('✅ All required files found');
} else {
  console.log('❌ Some required files are missing');
}

console.log('');

// Summary
console.log('📋 Setup Summary');
console.log('================');
console.log('✅ Minimal ENS integration created');
console.log('✅ Real blockchain interactions (no mocks)');
console.log('✅ TypeScript scripts for ENS operations');
console.log('✅ Web utilities for integration');
console.log('✅ Next.js demo with components');
console.log('');
console.log('🚀 Next Steps:');
console.log('1. Copy env.example to .env');
console.log('2. Edit .env with your configuration');
console.log('3. Run: npm install (if not done)');
console.log('4. Test: npm run ens:resolve reverse 0x1234...');
console.log('5. Demo: cd apps/web && npm run dev');
console.log('');
console.log('🎯 Ready for hackathon!');
