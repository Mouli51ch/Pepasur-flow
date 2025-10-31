const express = require('express');
const router = express.Router();
const FaucetService = require('../services/FaucetService');

const faucetService = new FaucetService();

// Server-side faucet claiming endpoint
router.post('/claim', async (req, res) => {
  try {
    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    // Validate address format
    if (!faucetService.isValidAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    console.log(`🚰 API: Claim request for user: ${userAddress}`);

    // Server claims tokens and transfers to user
    const result = await faucetService.claimTokensForUser(userAddress);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ API Error claiming tokens:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to claim tokens'
    });
  }
});

// Get faucet info for user
router.get('/info/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!faucetService.isValidAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    const faucetInfo = await faucetService.getFaucetInfo(userAddress);
    const countdown = await faucetService.getClaimCountdown(userAddress);

    res.json({
      success: true,
      data: {
        ...faucetInfo,
        ...countdown,
        timeRemaining: faucetService.formatTimeRemaining(countdown.timeUntilNextClaim)
      }
    });

  } catch (error) {
    console.error('❌ API Error getting faucet info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get faucet info'
    });
  }
});

// Get faucet statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await faucetService.getFaucetStats();
    const serverInfo = await faucetService.getServerWalletInfo();

    res.json({
      success: true,
      data: {
        ...stats,
        server: serverInfo
      }
    });

  } catch (error) {
    console.error('❌ API Error getting faucet stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get faucet stats'
    });
  }
});

// Get server wallet info
router.get('/server-info', async (req, res) => {
  try {
    const serverInfo = await faucetService.getServerWalletInfo();

    res.json({
      success: true,
      data: serverInfo
    });

  } catch (error) {
    console.error('❌ API Error getting server info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get server info'
    });
  }
});

// Get service status for debugging
router.get('/status', async (req, res) => {
  try {
    const status = faucetService.getServiceStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('❌ API Error getting service status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get service status'
    });
  }
});

module.exports = router;
