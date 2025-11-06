#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const { createPublicClient, http, getContract } = require('viem');
const { sepolia } = require('viem/chains');
const { normalize, namehash } = require('viem/ens');

// Load environment variables
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf8');
      const envVars = envContent.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.split('='))
        .filter(([key]) => key && key.trim());
      
      for (const [key, value] of envVars) {
        process.env[key.trim()] = value?.trim();
      }
    }
  } catch (error) {
    console.warn('No .env file found, using system environment variables');
  }
}

loadEnv();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create public client
const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.RPC_URL || 'https://ethereum-sepolia.publicnode.com')
});

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
];

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
];

// Get contracts
const universalResolver = getContract({
  address: process.env.UNIVERSAL_RESOLVER || '0xc0497E381f536Be9ce14B0dD3817cBcAe57d2F62',
  abi: UNIVERSAL_RESOLVER_ABI,
  client
});

const publicResolver = getContract({
  address: process.env.PUBLIC_RESOLVER || '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
  abi: PUBLIC_RESOLVER_ABI,
  client
});

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    server: 'Pepasur ENS API',
    chain: 'sepolia',
    universalResolver: universalResolver.address,
    publicResolver: publicResolver.address
  });
});

// Get player display name (reverse lookup + forward verify)
app.get('/api/player/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    // 1. Reverse lookup
    const reverseNode = namehash(`${address.slice(2)}.addr.reverse`);
    const name = await publicResolver.read.name([reverseNode]);
    
    if (!name || name === '') {
      return res.json({
        success: true,
        player: {
          address,
          ensName: null,
          hasENS: false,
          flowAddress: null,
          records: {}
        }
      });
    }

    // 2. Forward verify
    const node = namehash(name);
    const resolvedAddress = await publicResolver.read.addr([node]);
    
    if (resolvedAddress?.toLowerCase() !== address.toLowerCase()) {
      return res.json({
        success: true,
        player: {
          address,
          ensName: null,
          hasENS: false,
          flowAddress: null,
          records: {}
        }
      });
    }

    // 3. Get text records
    const records = {};
    const textKeys = ['description', 'avatar', 'url', 'com.github', 'com.twitter', 'flow.address'];
    
    for (const key of textKeys) {
      try {
        const value = await publicResolver.read.text([node, key]);
        if (value && value !== '') {
          records[key] = value;
        }
      } catch (error) {
        // Record doesn't exist, skip
      }
    }

    res.json({
      success: true,
      player: {
        address,
        ensName: name,
        hasENS: true,
        flowAddress: records['flow.address'] || null,
        records
      }
    });

  } catch (error) {
    console.error('Error getting player info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get Flow address from ENS name
app.get('/api/flow-address/:ensName', async (req, res) => {
  try {
    const { ensName } = req.params;
    
    const normalizedName = normalize(ensName);
    const node = namehash(normalizedName);
    
    const flowAddress = await publicResolver.read.text([node, 'flow.address']);
    
    res.json({
      success: true,
      ensName: normalizedName,
      flowAddress: flowAddress || null
    });

  } catch (error) {
    console.error('Error getting Flow address:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get contract information
app.get('/api/contract/:ensName', async (req, res) => {
  try {
    const { ensName } = req.params;
    
    const normalizedName = normalize(ensName);
    const node = namehash(normalizedName);
    
    // Get address
    const address = await publicResolver.read.addr([node]);
    
    // Get reverse name
    let reverseName = null;
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      try {
        const reverseNode = namehash(`${address.slice(2)}.addr.reverse`);
        reverseName = await publicResolver.read.name([reverseNode]);
      } catch (error) {
        // No reverse record
      }
    }
    
    // Get text records
    const records = {};
    const textKeys = ['description', 'avatar', 'url', 'com.github', 'com.twitter'];
    
    for (const key of textKeys) {
      try {
        const value = await publicResolver.read.text([node, key]);
        if (value && value !== '') {
          records[key] = value;
        }
      } catch (error) {
        // Record doesn't exist, skip
      }
    }
    
    res.json({
      success: true,
      contract: {
        ensName: normalizedName,
        address: address || null,
        reverseName,
        records
      }
    });

  } catch (error) {
    console.error('Error getting contract info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get text record
app.get('/api/text/:ensName/:key', async (req, res) => {
  try {
    const { ensName, key } = req.params;
    
    const normalizedName = normalize(ensName);
    const node = namehash(normalizedName);
    
    const value = await publicResolver.read.text([node, key]);
    
    res.json({
      success: true,
      ensName: normalizedName,
      key,
      value: value || null
    });

  } catch (error) {
    console.error('Error getting text record:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get address from ENS name
app.get('/api/address/:ensName', async (req, res) => {
  try {
    const { ensName } = req.params;
    
    const normalizedName = normalize(ensName);
    const node = namehash(normalizedName);
    
    const address = await publicResolver.read.addr([node]);
    
    res.json({
      success: true,
      ensName: normalizedName,
      address: address || null
    });

  } catch (error) {
    console.error('Error getting address:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Verify ENS name (forward verification)
app.post('/api/verify', async (req, res) => {
  try {
    const { ensName, address } = req.body;
    
    if (!ensName || !address) {
      return res.status(400).json({
        success: false,
        error: 'ensName and address are required'
      });
    }

    const normalizedName = normalize(ensName);
    const node = namehash(normalizedName);
    const resolvedAddress = await publicResolver.read.addr([node]);
    
    const isValid = resolvedAddress?.toLowerCase() === address.toLowerCase();
    
    res.json({
      success: true,
      verification: {
        ensName: normalizedName,
        providedAddress: address,
        resolvedAddress: resolvedAddress || null,
        isValid
      }
    });

  } catch (error) {
    console.error('Error verifying ENS name:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/player/:address',
      'GET /api/flow-address/:ensName',
      'GET /api/contract/:ensName',
      'GET /api/text/:ensName/:key',
      'GET /api/address/:ensName',
      'POST /api/verify'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🎮 Pepasur ENS API Server');
  console.log('=========================');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /api/player/:address - Get player info (reverse + forward verify)');
  console.log('  GET  /api/flow-address/:ensName - Get Flow address from ENS name');
  console.log('  GET  /api/contract/:ensName - Get contract information');
  console.log('  GET  /api/text/:ensName/:key - Get specific text record');
  console.log('  GET  /api/address/:ensName - Get address from ENS name');
  console.log('  POST /api/verify - Verify ENS name against address');
  console.log('');
  console.log('🎯 Ready for frontend integration!');
});
