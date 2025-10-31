/**
 * Test script for EvmServiceSimple
 *
 * Usage: node test-evm-service.js
 */

require('dotenv').config();
const EvmServiceSimple = require('./services/EvmServiceSimple');

async function testEvmService() {
  console.log('🧪 Testing EvmServiceSimple...\n');

  // Initialize service
  const evmService = new EvmServiceSimple();

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 5000));

  if (!evmService.isReady()) {
    console.error('❌ EVM Service failed to initialize');
    process.exit(1);
  }

  try {
    // Test 1: Get contract info
    console.log('📋 Test 1: Get Contract Info');
    const info = await evmService.getContractInfo();
    console.log('✅ Contract Info:');
    console.log('├─ Owner:', info.owner);
    console.log('├─ Next Game ID:', info.nextGameId);
    console.log('└─ House Cut:', info.houseCutBps, 'bps\n');

    // Test 2: Check if any games exist
    console.log('📋 Test 2: Check for Existing Games');
    if (info.nextGameId > 1) {
      const gameId = 1;
      const game = await evmService.getGameInfo(gameId);
      console.log('✅ Game 1 Info:');
      console.log('├─ Creator:', game.creator);
      console.log('├─ Stake:', evmService.formatFlow(game.stakeAmount), 'FLOW');
      console.log('├─ Players:', game.players.length);
      console.log('├─ Status:', ['LOBBY', 'IN_PROGRESS', 'SETTLED'][game.status]);
      console.log('└─ Pool:', evmService.formatFlow(game.totalPool), 'FLOW\n');
    } else {
      console.log('ℹ️  No games created yet\n');
    }

    // Test 3: Check pending withdrawals
    console.log('📋 Test 3: Check Pending Withdrawals');
    if (process.env.SERVER_ADDRESS) {
      const pending = await evmService.getPendingWithdrawal(process.env.SERVER_ADDRESS);
      console.log('✅ Pending withdrawal for', process.env.SERVER_ADDRESS);
      console.log('└─ Amount:', evmService.formatFlow(pending), 'FLOW\n');
    }

    console.log('✅ All tests passed!\n');

    console.log('📝 Next Steps:');
    console.log('1. Create a test game from frontend or using createGameForTesting()');
    console.log('2. Have players join the game');
    console.log('3. Play the game (off-chain logic)');
    console.log('4. Call submitSettlement() with winners');
    console.log('5. Winners call withdraw() to claim rewards\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testEvmService()
  .then(() => {
    console.log('🎉 Testing complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
