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
      { name: 'resolver', type: 'address' }
    ],
    name: 'resolver',
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
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' }
    ],
    name: 'setText',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'interfaceId', type: 'bytes4' }
    ],
    name: 'supportsInterface',
    outputs: [
      { name: '', type: 'bool' }
    ],
    stateMutability: 'view',
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
  client: publicClient
});

const publicResolver = getContract({
  address: process.env.PUBLIC_RESOLVER as `0x${string}`,
  abi: PUBLIC_RESOLVER_ABI,
  client: walletClient
});

/**
 * Check if resolver supports text records interface
 */
async function checkResolverInterface(resolverAddress: `0x${string}`): Promise<boolean> {
  try {
    // Text records interface ID: 0x59d1d68c
    const textInterfaceId = '0x59d1d68c' as `0x${string}`;
    const resolver = getContract({
      address: resolverAddress,
      abi: PUBLIC_RESOLVER_ABI,
      client: publicClient
    });
    
    return await resolver.read.supportsInterface([textInterfaceId]);
  } catch (error) {
    console.error('Interface check failed:', error);
    return false;
  }
}

/**
 * Set text record on ENS name
 */
export async function setTextRecord(
  name: string, 
  key: string, 
  value: string
): Promise<`0x${string}`> {
  try {
    const normalizedName = normalize(name);
    const node = namehash(normalizedName);
    
    // Get current resolver
    const resolverAddress = await ensRegistry.read.resolver([node]);
    
    if (!resolverAddress || resolverAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`No resolver set for ${name}`);
    }
    
    // Check if resolver supports text records
    const supportsText = await checkResolverInterface(resolverAddress);
    if (!supportsText) {
      throw new Error(`Resolver at ${resolverAddress} does not support text records`);
    }
    
    // Set text record
    const hash = await publicResolver.write.setText([node, key, value]);
    
    console.log(`✅ Text record set: ${name}.${key} = ${value}`);
    console.log(`   Transaction: ${hash}`);
    
    return hash;
  } catch (error) {
    console.error('❌ Failed to set text record:', error);
    throw error;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: pnpm ens:set-text --name <ens-name> --key <key> --value <value>');
    console.log('');
    console.log('Examples:');
    console.log('  pnpm ens:set-text --name pepasur.eth --key flow.address --value 0x1234...');
    console.log('  pnpm ens:set-text --name alice.pepasur.eth --key description --value "Alice from Pepasur"');
    console.log('  pnpm ens:set-text --name treasury.pepasur.eth --key com.github --value "https://github.com/pepasur"');
    return;
  }
  
  let name = '';
  let key = '';
  let value = '';
  
  // Parse arguments
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const val = args[i + 1];
    
    switch (flag) {
      case '--name':
        name = val;
        break;
      case '--key':
        key = val;
        break;
      case '--value':
        value = val;
        break;
    }
  }
  
  if (!name || !key || !value) {
    console.error('❌ Missing required arguments: --name, --key, --value');
    return;
  }
  
  try {
    console.log(`🔧 Setting text record for ${name}...`);
    console.log(`   Key: ${key}`);
    console.log(`   Value: ${value}`);
    console.log('');
    
    const hash = await setTextRecord(name, key, value);
    
    console.log('');
    console.log('🎉 Text record set successfully!');
    console.log(`   View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${hash}`);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
