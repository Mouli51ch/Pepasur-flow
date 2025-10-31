# Deploy Fixed Contract Guide

## 🚀 Quick Deployment

### 1. Deploy the Fixed Contract

```bash
cd contract-flow
npm run deploy:fixed
```

Or manually:
```bash
npx hardhat run scripts/deploy-fixed.js --network flow-testnet
```

### 2. Update Environment Variables

After deployment, update these files with the new contract address:

**Backend `.env`:**
```
PEPASUR_CONTRACT_ADDRESS=<NEW_CONTRACT_ADDRESS>
```

**Frontend `.env`:**
```
NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=<NEW_CONTRACT_ADDRESS>
```

### 3. Restart Services

```bash
# Restart backend
cd backend && npm restart

# Restart frontend  
cd PepasurAptos/frontend && npm run dev
```

## 🎮 What's Fixed

### ✅ **4-Player Support**
- Games now support exactly 4 players
- `minPlayers: 4, maxPlayers: 4`
- All 4 players must join before game starts

### ✅ **Proper Game Flow**
```
LOBBY → READY → IN_PROGRESS → SETTLED
```
- **LOBBY**: Accepting first players
- **READY**: Min players reached, can accept more
- **IN_PROGRESS**: Game started, no more joins
- **SETTLED**: Game ended, rewards distributed

### ✅ **Manual Start Control**
- Games don't auto-start at minPlayers
- Creator can manually start when ready
- Auto-start only when maxPlayers (4) reached

### ✅ **Reward Distribution**
- **98%** to winners
- **2%** house cut  
- **0%** to losers
- Proper validation of winners

## 🧪 Testing the Fix

### Test Scenario:
1. **Player 1** creates game (0.001 FLOW stake)
2. **Player 2** joins (0.001 FLOW stake) 
3. **Player 3** joins (0.001 FLOW stake)
4. **Player 4** joins (0.001 FLOW stake) → Game auto-starts
5. **Total Pool**: 0.004 FLOW
6. **Winner gets**: 0.00392 FLOW (98%)
7. **House gets**: 0.00008 FLOW (2%)

### Expected Results:
- ✅ All 4 transactions succeed
- ✅ Total pool = 0.004 FLOW
- ✅ Game starts after 4th player
- ✅ Rewards distributed correctly

## 🔍 Debugging

If issues persist after deployment:

1. **Check contract address** in both frontend and backend
2. **Use diagnostics tool** at `/diagnostics`
3. **Verify ABI** matches the deployed contract
4. **Check transaction logs** for specific errors

## 📝 New Contract Functions

### For Frontend Integration:

```typescript
// Create 4-player game
createGame(stakeAmount, 4, 4)

// Check if game can accept players
canJoinGame(gameId)

// Get detailed game stats
getGameStats(gameId)

// Manually start game (creator only)
startGame(gameId)
```

## 🚨 Important Notes

- **Backup old contract address** before updating
- **Test with small amounts** first
- **All players must use same stake amount**
- **Games auto-start when 4 players join**
- **Only winners get rewards (98% split)**