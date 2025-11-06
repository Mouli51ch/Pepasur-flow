/**
 * Simple synchronous test for EvmServiceSimple
 */

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🧪 Testing EVM Service Connection...\n');

  try {
    // Test 1: Connect to provider
    console.log('📡 Test 1: Connect to Flow EVM Testnet');
    const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Connected! Current block:', blockNumber, '\n');

    // Test 2: Load contract artifact
    console.log('📄 Test 2: Load Contract Artifact');
    const artifactPath = path.join(__dirname, '..', '..', 'contract-flow', 'artifacts', 'contracts', 'PepasurSimple.sol', 'PepasurSimple.json');
    console.log('Path:', artifactPath);

    if (!fs.existsSync(artifactPath)) {
      throw new Error('Artifact not found at: ' + artifactPath);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    console.log('✅ Artifact loaded! ABI has', artifact.abi.length, 'functions\n');

    // Test 3: Connect to contract
    console.log('📝 Test 3: Connect to Contract');
    const contractAddress = process.env.PEPASUR_CONTRACT_ADDRESS;
    console.log('Contract address:', contractAddress);

    const contract = new ethers.Contract(contractAddress, artifact.abi, provider);
    console.log('✅ Contract instance created\n');

    // Test 4: Read contract state
    console.log('📊 Test 4: Read Contract State');
    const owner = await contract.owner();
    console.log('├─ Owner:', owner);

    const nextGameId = await contract.nextGameId();
    console.log('├─ Next Game ID:', nextGameId.toString());

    const houseCut = await contract.houseCutBps();
    console.log('└─ House Cut:', houseCut.toString(), 'bps\n');

    // Test 5: Verify wallet
    console.log('🔑 Test 5: Verify Owner Wallet');
    if (process.env.SERVER_PRIVATE_KEY) {
      const wallet = new ethers.Wallet(process.env.SERVER_PRIVATE_KEY, provider);
      console.log('├─ Your wallet:', wallet.address);
      console.log('├─ Contract owner:', owner);
      console.log('└─ Match:', wallet.address.toLowerCase() === owner.toLowerCase() ? '✅ YES' : '❌ NO');

      if (wallet.address.toLowerCase() !== owner.toLowerCase()) {
        console.log('\n⚠️  WARNING: You are NOT the contract owner!');
        console.log('⚠️  You will NOT be able to settle games!');
      }
    }

    console.log('\n✅ All tests passed!');
    console.log('\n🎉 EvmServiceSimple should work correctly!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
