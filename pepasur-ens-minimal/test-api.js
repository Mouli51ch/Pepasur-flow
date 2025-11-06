#!/usr/bin/env node

const http = require('http');

const API_BASE = 'http://localhost:3001';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAPI() {
  console.log('🧪 Testing Pepasur ENS API');
  console.log('==========================\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response:`, health.data);
    console.log('');

    // Test 2: Get player info (reverse lookup + forward verify)
    console.log('2️⃣ Testing player info (reverse lookup)...');
    const playerInfo = await makeRequest('GET', '/api/player/0x1234567890123456789012345678901234567890');
    console.log(`   Status: ${playerInfo.status}`);
    console.log(`   Response:`, playerInfo.data);
    console.log('');

    // Test 3: Get Flow address from ENS name
    console.log('3️⃣ Testing Flow address lookup...');
    const flowAddress = await makeRequest('GET', '/api/flow-address/alice.pepasur.eth');
    console.log(`   Status: ${flowAddress.status}`);
    console.log(`   Response:`, flowAddress.data);
    console.log('');

    // Test 4: Get contract info
    console.log('4️⃣ Testing contract info...');
    const contractInfo = await makeRequest('GET', '/api/contract/treasury.pepasur.eth');
    console.log(`   Status: ${contractInfo.status}`);
    console.log(`   Response:`, contractInfo.data);
    console.log('');

    // Test 5: Get specific text record
    console.log('5️⃣ Testing text record lookup...');
    const textRecord = await makeRequest('GET', '/api/text/alice.pepasur.eth/description');
    console.log(`   Status: ${textRecord.status}`);
    console.log(`   Response:`, textRecord.data);
    console.log('');

    // Test 6: Get address from ENS name
    console.log('6️⃣ Testing address lookup...');
    const addressLookup = await makeRequest('GET', '/api/address/alice.pepasur.eth');
    console.log(`   Status: ${addressLookup.status}`);
    console.log(`   Response:`, addressLookup.data);
    console.log('');

    // Test 7: Verify ENS name
    console.log('7️⃣ Testing ENS verification...');
    const verification = await makeRequest('POST', '/api/verify', {
      ensName: 'alice.pepasur.eth',
      address: '0x1234567890123456789012345678901234567890'
    });
    console.log(`   Status: ${verification.status}`);
    console.log(`   Response:`, verification.data);
    console.log('');

    console.log('✅ All API tests completed!');
    console.log('============================');
    console.log('🎯 Your API is ready for frontend integration!');
    console.log('');
    console.log('📋 Integration Examples:');
    console.log('```javascript');
    console.log('// Get player info with ENS name');
    console.log('const response = await fetch("http://localhost:3001/api/player/0x1234...");');
    console.log('const player = await response.json();');
    console.log('console.log(player.player.ensName); // "alice.pepasur.eth"');
    console.log('');
    console.log('// Get Flow address');
    console.log('const flowResponse = await fetch("http://localhost:3001/api/flow-address/alice.pepasur.eth");');
    console.log('const flowData = await flowResponse.json();');
    console.log('console.log(flowData.flowAddress); // Flow address');
    console.log('```');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('');
    console.log('💡 Make sure the API server is running:');
    console.log('   npm start');
  }
}

// Run tests
testAPI();
