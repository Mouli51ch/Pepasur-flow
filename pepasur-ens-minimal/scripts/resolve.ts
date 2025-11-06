#!/usr/bin/env tsx

import { createPublicClient, http, getContract } from 'viem';
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
const UNIVERSAL_RESOLVER_ABI = [
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'data', type: 'bytes' }
    ],
    name: 'resolve',
    outputs: [
      { name: '', type: 'bytes' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

const PUBLIC_RESOLVER_ABI = [
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' }
    ],
    name: 'text',
    outputs: [
      { name: '', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' }
    ],
    name: 'addr',
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
    name: 'name',
    outputs: [
      { name: '', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Create public client
const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.RPC_URL)
});

// Get contracts
const universalResolver = getContract({
  address: process.env.UNIVERSAL_RESOLVER as `0x${string}`,
  abi: UNIVERSAL_RESOLVER_ABI,
  client
});

const publicResolver = getContract({
  address: process.env.PUBLIC_RESOLVER as `0x${string}`,
  abi: PUBLIC_RESOLVER_ABI,
  client
});

/**
 * Reverse lookup: Get ENS name from address
 */
export async function reverseLookup(address: `0x${string}`): Promise<string | null> {
  try {
    const reverseNode = namehash(`${address.slice(2)}.addr.reverse`);
    const name = await publicResolver.read.name([reverseNode]);
    return name || null;
  } catch (error) {
    console.error('Reverse lookup failed:', error);
    return null;
  }
}

/**
 * Forward verify: Check if name resolves to address
 */
export async function forwardVerify(name: string, address: `0x${string}`): Promise<boolean> {
  try {
    const normalizedName = normalize(name);
    const node = namehash(normalizedName);
    const resolvedAddress = await publicResolver.read.addr([node]);
    return resolvedAddress?.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Forward verify failed:', error);
    return false;
  }
}

/**
 * Get text record from ENS name
 */
export async function getText(name: string, key: string): Promise<string | null> {
  try {
    const normalizedName = normalize(name);
    const node = namehash(normalizedName);
    
    // Use Universal Resolver
    const textSelector = '0x59d1d68c'; // text(bytes32,string)
    const data = `${textSelector}${node.slice(2)}${Buffer.from(key).toString('hex').padStart(64, '0')}`;
    
    const result = await universalResolver.read.resolve([normalizedName, data as `0x${string}`]);
    
    if (result === '0x') return null;
    
    // Decode the result (simplified - in production use proper ABI decoding)
    return result.slice(2) ? '0x' + result.slice(2) : null;
  } catch (error) {
    console.error('Get text failed:', error);
    return null;
  }
}

/**
 * Get address from ENS name
 */
export async function getAddr(name: string): Promise<`0x${string}` | null> {
  try {
    const normalizedName = normalize(name);
    const node = namehash(normalizedName);
    
    // Use Universal Resolver
    const addrSelector = '0x3b3b57de'; // addr(bytes32)
    const data = `${addrSelector}${node.slice(2)}`;
    
    const result = await universalResolver.read.resolve([normalizedName, data as `0x${string}`]);
    
    if (result === '0x' || result.length < 42) return null;
    
    return result.slice(0, 42) as `0x${string}`;
  } catch (error) {
    console.error('Get addr failed:', error);
    return null;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  tsx scripts/resolve.ts reverse <address>');
    console.log('  tsx scripts/resolve.ts forward <name> <address>');
    console.log('  tsx scripts/resolve.ts text <name> <key>');
    console.log('  tsx scripts/resolve.ts addr <name>');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'reverse': {
      const address = args[1] as `0x${string}`;
      if (!address) {
        console.error('Address required');
        return;
      }
      const name = await reverseLookup(address);
      console.log(`Reverse lookup for ${address}: ${name || 'No name found'}`);
      break;
    }
    
    case 'forward': {
      const name = args[1];
      const address = args[2] as `0x${string}`;
      if (!name || !address) {
        console.error('Name and address required');
        return;
      }
      const isValid = await forwardVerify(name, address);
      console.log(`Forward verify for ${name} → ${address}: ${isValid ? 'Valid' : 'Invalid'}`);
      break;
    }
    
    case 'text': {
      const name = args[1];
      const key = args[2];
      if (!name || !key) {
        console.error('Name and key required');
        return;
      }
      const value = await getText(name, key);
      console.log(`Text record ${name}.${key}: ${value || 'Not found'}`);
      break;
    }
    
    case 'addr': {
      const name = args[1];
      if (!name) {
        console.error('Name required');
        return;
      }
      const address = await getAddr(name);
      console.log(`Address for ${name}: ${address || 'Not found'}`);
      break;
    }
    
    default:
      console.error('Unknown command:', command);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
