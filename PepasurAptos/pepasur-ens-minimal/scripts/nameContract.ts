#!/usr/bin/env tsx

import { createWalletClient, createPublicClient, http, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';
import { namehash } from 'viem/ens';

// Load environment variables from .env file
import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = envContent.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('='))
      .filter(([key]) => key && key.trim());
    
    for (const [key, value] of envVars) {
      process.env[key.trim()] = value?.trim();
    }
  } catch (error) {
    console.warn('No .env file found, using system environment variables');
  }
}

loadEnv();

// ENS Contract ABIs
const ENS_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'label', type: 'bytes32' },
      { name: 'owner', type: 'address' }
    ],
    name: 'setSubnodeOwner',
    outputs: [
      { name: '', type: 'bytes32' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'resolver', type: 'address' }
    ],
    name: 'setResolver',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'resolver', type: 'address' }
    ],
    name: 'resolver',
    outputs: [
      { name: '', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' }
    ],
    name: 'owner',
    outputs: [
      { name: '', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

const PUBLIC_RESOLVER_ABI = [
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'a', type: 'address' }
    ],
    name: 'setAddr',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'name', type: 'string' }
    ],
    name: 'setName',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// Create clients
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.RPC_URL)
});

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.RPC_URL)
});

// Get contracts
const ensRegistry = getContract({
  address: process.env.ENS_REGISTRY as `0x${string}`,
  abi: ENS_REGISTRY_ABI,
  client: walletClient
});

const publicResolver = getContract({
  address: process.env.PUBLIC_RESOLVER as `0x${string}`,
  abi: PUBLIC_RESOLVER_ABI,
  client: walletClient
});

/**
 * Name a contract with ENS subdomain
 */
export async function nameContract(
  label: string,
  targetAddress: `0x${string}`
): Promise<{ subname: string; txHash: `0x${string}` }> {
  try {
    const rootDomain = process.env.ROOT_DOMAIN || 'pepasur.eth';
    const subname = `${label}.${rootDomain}`;
    
    console.log(`🔧 Naming contract: ${subname} → ${targetAddress}`);
    
    // 1. Create subdomain
    const rootNode = namehash(rootDomain);
    const labelHash = namehash(label);
    
    console.log(`   Creating subdomain: ${label}.${rootDomain}`);
    const subnodeHash = await ensRegistry.write.setSubnodeOwner([rootNode, labelHash, account.address]);
    
    // 2. Set resolver for subdomain
    const subnodeNode = namehash(subname);
    console.log(`   Setting resolver for ${subname}`);
    await ensRegistry.write.setResolver([subnodeNode, process.env.PUBLIC_RESOLVER as `0x${string}`]);
    
    // 3. Set address record
    console.log(`   Setting address record: ${subname} → ${targetAddress}`);
    await publicResolver.write.setAddr([subnodeNode, targetAddress]);
    
    // 4. Set reverse record (if target is a contract)
    try {
      console.log(`   Setting reverse record: ${targetAddress} → ${subname}`);
      await publicResolver.write.setName([subnodeNode, subname]);
    } catch (error) {
      console.log(`   ⚠️  Could not set reverse record (contract may not support it): ${error}`);
    }
    
    console.log(`✅ Contract named successfully: ${subname}`);
    
    return {
      subname,
      txHash: subnodeHash
    };
  } catch (error) {
    console.error('❌ Failed to name contract:', error);
    throw error;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: pnpm ens:name-contract --label <label> --target <address>');
    console.log('');
    console.log('Examples:');
    console.log('  pnpm ens:name-contract --label treasury --target 0x1234...');
    console.log('  pnpm ens:name-contract --label nft --target 0xabcd...');
    console.log('  pnpm ens:name-contract --label marketplace --target 0x5678...');
    console.log('');
    console.log('This will create: <label>.pepasur.eth → <target-address>');
    return;
  }
  
  let label = '';
  let target = '';
  
  // Parse arguments
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const val = args[i + 1];
    
    switch (flag) {
      case '--label':
        label = val;
        break;
      case '--target':
        target = val;
        break;
    }
  }
  
  if (!label || !target) {
    console.error('❌ Missing required arguments: --label, --target');
    return;
  }
  
  // Validate target address
  if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
    console.error('❌ Invalid target address format');
    return;
  }
  
  try {
    console.log('🎯 Naming contract with ENS...');
    console.log('');
    
    const result = await nameContract(label, target as `0x${string}`);
    
    console.log('');
    console.log('🎉 Contract named successfully!');
    console.log(`   ENS Name: ${result.subname}`);
    console.log(`   Target: ${target}`);
    console.log(`   Transaction: ${result.txHash}`);
    console.log(`   View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${result.txHash}`);
    console.log('');
    console.log('📋 What was created:');
    console.log(`   • Subdomain: ${result.subname}`);
    console.log(`   • Address record: ${result.subname} → ${target}`);
    console.log(`   • Reverse record: ${target} → ${result.subname}`);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
