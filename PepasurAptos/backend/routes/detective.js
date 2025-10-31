const express = require('express');
const crypto = require('crypto');

module.exports = (gameManager) => {
  const router = express.Router();

  // Store detective reveal
  router.post('/reveal', (req, res) => {
    try {
      const { gameId, detective, target, revealedRole, signature } = req.body;
      
      if (!gameId || !detective || !target || !revealedRole || !signature) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const game = gameManager.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Verify detective role
      if (game.roles[detective] !== 'Detective') {
        return res.status(400).json({ error: 'Only detectives can reveal roles' });
      }

      // Store reveal
      const reveal = {
        gameId,
        detective,
        target,
        revealedRole,
        signature,
        timestamp: Date.now()
      };

      gameManager.storeDetectiveReveal(gameId, reveal);
      
      res.json({
        success: true,
        message: 'Detective reveal stored successfully'
      });
    } catch (error) {
      console.error('Error storing detective reveal:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get detective reveals for a game
  router.get('/reveals/:gameId', (req, res) => {
    try {
      const { gameId } = req.params;
      
      const game = gameManager.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const reveals = gameManager.getDetectiveReveals(gameId);
      
      res.json({
        success: true,
        reveals
      });
    } catch (error) {
      console.error('Error getting detective reveals:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify detective reveal signature
  router.post('/verify', (req, res) => {
    try {
      const { gameId, detective, target, revealedRole, signature } = req.body;
      
      if (!gameId || !detective || !target || !revealedRole || !signature) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const game = gameManager.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Verify detective role
      if (game.roles[detective] !== 'Detective') {
        return res.status(400).json({ error: 'Only detectives can verify reveals' });
      }

      // Create message hash
      const message = `${gameId}:${detective}:${target}:${revealedRole}`;
      const messageHash = crypto.createHash('sha256').update(message).digest('hex');
      
      // Verify signature (simplified - in production, use proper ECDSA verification)
      const isValid = this.verifySignature(messageHash, signature, detective);
      
      // Check if revealed role matches actual role
      const actualRole = game.roles[target];
      const roleMatch = revealedRole === actualRole;
      
      res.json({
        success: true,
        valid: isValid,
        roleMatch,
        actualRole: roleMatch ? actualRole : 'hidden',
        message: isValid 
          ? (roleMatch ? 'Reveal is valid and correct' : 'Reveal is valid but incorrect')
          : 'Invalid signature'
      });
    } catch (error) {
      console.error('Error verifying detective reveal:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get detective info for a game
  router.get('/info/:gameId', (req, res) => {
    try {
      const { gameId } = req.params;
      
      const game = gameManager.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Find detective
      const detective = game.players.find(p => game.roles[p] === 'Detective');
      
      if (!detective) {
        return res.status(404).json({ error: 'No detective found in this game' });
      }

      const reveals = gameManager.getDetectiveReveals(gameId);
      const detectiveReveals = reveals.filter(r => r.detective === detective);
      
      res.json({
        success: true,
        detective,
        reveals: detectiveReveals,
        totalReveals: detectiveReveals.length
      });
    } catch (error) {
      console.error('Error getting detective info:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper function to verify signature (simplified)
  function verifySignature(messageHash, signature, expectedSigner) {
    // In a real implementation, this would use proper ECDSA verification
    // For now, we'll do a simple check
    try {
      // This is a placeholder - implement proper signature verification
      return signature.length === 132 && signature.startsWith('0x');
    } catch (error) {
      return false;
    }
  }

  return router;
};
