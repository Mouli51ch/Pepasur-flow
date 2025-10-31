const express = require('express');
const router = express.Router();

// Staking routes
router.post('/stake', async (req, res) => {
  try {
    const { gameId, playerAddress, roomCode } = req.body;
    
    if (!gameId || !playerAddress || !roomCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: gameId, playerAddress, roomCode' 
      });
    }

    const gameManager = req.app.locals.gameManager;
    const stakeResult = await gameManager.stakeForGame(gameId, playerAddress, roomCode);
    
    res.json({
      success: true,
      data: stakeResult
    });
  } catch (error) {
    console.error('❌ Error in stake route:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get game staking info
router.get('/staking/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameManager = req.app.locals.gameManager;
    
    const stakingInfo = gameManager.getGameStakingInfo(gameId);
    
    if (!stakingInfo) {
      return res.status(404).json({ 
        success: false, 
        error: 'Game not found or no staking info available' 
      });
    }
    
    res.json({
      success: true,
      data: stakingInfo
    });
  } catch (error) {
    console.error('❌ Error in staking info route:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get player stake info
router.get('/staking/:gameId/:playerAddress', (req, res) => {
  try {
    const { gameId, playerAddress } = req.params;
    const gameManager = req.app.locals.gameManager;
    
    const stakeInfo = gameManager.getPlayerStakeInfo(gameId, playerAddress);
    
    if (!stakeInfo) {
      return res.status(404).json({ 
        success: false, 
        error: 'Player stake not found' 
      });
    }
    
    res.json({
      success: true,
      data: stakeInfo
    });
  } catch (error) {
    console.error('❌ Error in player stake info route:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check player balance
router.get('/balance/:playerAddress', async (req, res) => {
  try {
    const { playerAddress } = req.params;
    const gameManager = req.app.locals.gameManager;
    
    const balanceInfo = await gameManager.checkPlayerBalance(playerAddress);
    
    res.json({
      success: true,
      data: balanceInfo
    });
  } catch (error) {
    console.error('❌ Error in balance check route:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all staked games (admin)
router.get('/staking', (req, res) => {
  try {
    const gameManager = req.app.locals.gameManager;
    const stakedGames = gameManager.stakingService.getAllStakedGames();
    
    res.json({
      success: true,
      data: stakedGames
    });
  } catch (error) {
    console.error('❌ Error in all staked games route:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
