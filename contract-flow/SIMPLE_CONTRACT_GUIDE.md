# PepasurSimple - Simplified Game Contract

A streamlined version of the Pepasur Mafia game contract focusing on core staking and reward mechanics.

## Key Simplifications

✅ **Owner-based settlement** (no complex signature verification)
✅ **Minimal functions** (create, join, settle, withdraw)
✅ **No initialization needed** (ready to use after deployment)
✅ **Smaller bytecode** (~3KB vs 10KB+)
✅ **Lower gas costs**
✅ **Easier to deploy via Remix**

## Contract Size Comparison

| Feature | PepasurSimple | Pepasur (Full) |
|---------|---------------|----------------|
| Lines of Code | ~200 | ~600 |
| Bytecode Size | ~3KB | ~10KB |
| Dependencies | None | OpenZeppelin (ECDSA, EIP712, ReentrancyGuard) |
| Signature Verification | No (owner settles) | Yes (EIP-712) |
| Initialization | No | Yes (required) |
| Gas Cost | Lower | Higher |

---

## Core Functions

### 1. Create Game
```solidity
function createGame(uint256 stakeAmount, uint8 minPlayers) external payable returns (uint64)
```

**Parameters:**
- `stakeAmount`: Amount each player must stake (in wei)
- `minPlayers`: Minimum players to start (2-10)

**Requirements:**
- Must send `msg.value == stakeAmount`
- `stakeAmount > 0`
- `minPlayers` between 2-10

**Returns:** Game ID

**Example:**
```javascript
// Create game with 1 FLOW stake, 4 min players
const tx = await contract.createGame(
  ethers.parseEther("1.0"),
  4,
  { value: ethers.parseEther("1.0") }
);
```

---

### 2. Join Game
```solidity
function joinGame(uint64 gameId) external payable
```

**Parameters:**
- `gameId`: ID of game to join

**Requirements:**
- Must send exact stake amount for that game
- Game must be in LOBBY status
- Player not already in game
- Game not full (max 10 players)

**Auto-start:** Game automatically starts when `minPlayers` reached

**Example:**
```javascript
// Get stake amount first
const game = await contract.getGame(gameId);

// Join game
const tx = await contract.joinGame(gameId, {
  value: game.stakeAmount
});
```

---

### 3. Settle Game (Owner Only)
```solidity
function settleGame(uint64 gameId, address[] calldata winners) external onlyOwner
```

**Parameters:**
- `gameId`: ID of game to settle
- `winners`: Array of winner addresses

**Logic:**
1. Takes 2% house fee from total pool
2. Divides remaining 98% equally among winners
3. Queues withdrawals for winners
4. Transfers house fee to owner

**Example:**
```javascript
// Owner settles game with 2 winners
const winners = [
  "0x123...",
  "0x456..."
];

const tx = await contract.settleGame(gameId, winners);
```

**Reward Calculation:**
```
Total Pool = 4 players × 1 FLOW = 4 FLOW
House Fee = 4 FLOW × 2% = 0.08 FLOW
Reward Pool = 4 FLOW - 0.08 FLOW = 3.92 FLOW

If 2 winners:
  Each winner gets: 3.92 FLOW ÷ 2 = 1.96 FLOW
  Profit per winner: 1.96 FLOW - 1 FLOW = 0.96 FLOW (96% profit)
```

---

### 4. Withdraw
```solidity
function withdraw() external
```

**No parameters** - withdraws all pending balance for caller

**Example:**
```javascript
// Check pending withdrawal
const pending = await contract.getPendingWithdrawal(myAddress);
console.log("Pending:", ethers.formatEther(pending), "FLOW");

// Withdraw
const tx = await contract.withdraw();
```

---

## View Functions

### Get Game Details
```solidity
function getGame(uint64 gameId) external view returns (...)
```

**Returns:**
- `id`: Game ID
- `creator`: Creator address
- `stakeAmount`: Stake amount per player
- `minPlayers`: Minimum players
- `players`: Array of player addresses
- `status`: 0=LOBBY, 1=IN_PROGRESS, 2=SETTLED
- `totalPool`: Total staked amount

**Example:**
```javascript
const game = await contract.getGame(1);
console.log("Game 1:");
console.log("├─ Creator:", game.creator);
console.log("├─ Stake:", ethers.formatEther(game.stakeAmount));
console.log("├─ Players:", game.players.length);
console.log("├─ Status:", game.status);
console.log("└─ Pool:", ethers.formatEther(game.totalPool));
```

### Get Pending Withdrawal
```solidity
function getPendingWithdrawal(address player) external view returns (uint256)
```

### Get Players
```solidity
function getPlayers(uint64 gameId) external view returns (address[] memory)
```

---

## Admin Functions (Owner Only)

### Set House Cut
```solidity
function setHouseCut(uint16 newCutBps) external onlyOwner
```

**Parameters:**
- `newCutBps`: New house cut in basis points (max 1000 = 10%)

**Example:**
```javascript
// Set house cut to 3%
await contract.setHouseCut(300);
```

### Transfer Ownership
```solidity
function transferOwnership(address newOwner) external onlyOwner
```

### Emergency Refund
```solidity
function emergencyRefund(uint64 gameId) external onlyOwner
```

Refunds all players their stake amount (for stuck games).

---

## Deployment via Remix

### Step 1: Open Remix
Go to: https://remix.ethereum.org

### Step 2: Create File
- Click "New File"
- Name: `PepasurSimple.sol`
- Paste contents of `PepasurSimple-flattened.sol`

### Step 3: Compile
- Go to "Solidity Compiler" tab
- Compiler: `0.8.20`
- Optimization: Enabled (200 runs)
- Click "Compile"

### Step 4: Connect MetaMask
- Go to "Deploy & Run" tab
- Environment: "Injected Provider - MetaMask"
- Add Flow EVM Testnet to MetaMask:
  - **Chain ID:** 545
  - **RPC:** https://testnet.evm.nodes.onflow.org
  - **Symbol:** FLOW

### Step 5: Deploy
- Select "PepasurSimple" in CONTRACT dropdown
- Click "Deploy"
- Confirm in MetaMask

### Step 6: Copy Contract Address
- Expand deployed contract in Remix
- Copy address from top
- Save for backend/frontend configuration

---

## Usage Example (Complete Flow)

```javascript
const { ethers } = require("ethers");

// Setup
const provider = new ethers.JsonRpcProvider("https://testnet.evm.nodes.onflow.org");
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

// 1. Player 1 creates game
const stakeAmount = ethers.parseEther("1.0");
const tx1 = await contract.createGame(stakeAmount, 4, { value: stakeAmount });
const receipt1 = await tx1.wait();
const gameId = 1; // First game

// 2. Players 2-4 join
const tx2 = await contract.connect(player2).joinGame(gameId, { value: stakeAmount });
const tx3 = await contract.connect(player3).joinGame(gameId, { value: stakeAmount });
const tx4 = await contract.connect(player4).joinGame(gameId, { value: stakeAmount });
await tx4.wait(); // Game auto-starts

// 3. Backend plays game (off-chain)
// ... game logic happens ...

// 4. Owner settles game
const winners = [player1.address, player2.address]; // Non-Mafia won
const txSettle = await contract.connect(owner).settleGame(gameId, winners);
await txSettle.wait();

// 5. Winners withdraw
const txWithdraw1 = await contract.connect(player1).withdraw();
const txWithdraw2 = await contract.connect(player2).withdraw();
```

---

## Event Tracking

### GameCreated
```solidity
event GameCreated(uint64 indexed gameId, address indexed creator, uint256 stakeAmount)
```

### PlayerJoined
```solidity
event PlayerJoined(uint64 indexed gameId, address indexed player)
```

### GameStarted
```solidity
event GameStarted(uint64 indexed gameId, uint256 playerCount)
```

### GameSettled
```solidity
event GameSettled(uint64 indexed gameId, address[] winners, uint256 reward)
```

### Withdrawn
```solidity
event Withdrawn(address indexed player, uint256 amount)
```

---

## Security Notes

### ✅ Included
- Owner-only settlement
- Re-entrancy protection (checks-effects-interactions pattern)
- Stake amount validation
- Player duplicate check
- Emergency refund mechanism

### ⚠️ Not Included (vs Full Contract)
- EIP-712 signature verification
- Server-signed settlements
- Advanced reentrancy guards
- Comprehensive error messages
- Game cancellation

### Recommendations
- **For Production:** Use full Pepasur contract with EIP-712 signatures
- **For Testing/MVPs:** PepasurSimple is sufficient
- **Owner Key Security:** Keep owner private key very secure (can settle all games)

---

## Gas Estimates

| Function | Gas Cost (approx) |
|----------|------------------|
| createGame | ~100K gas |
| joinGame | ~80K gas |
| settleGame (2 winners) | ~120K gas |
| withdraw | ~40K gas |

**Total for 4-player game:** ~460K gas ≈ 0.00046 FLOW

---

## Backend Integration

```javascript
// backend/services/EvmServiceSimple.js
class EvmServiceSimple {
  async settleGame(gameId, winners) {
    // Owner wallet signs and submits
    const tx = await this.contract.settleGame(gameId, winners);
    return await tx.wait();
  }
}
```

**Key Difference:** No signature generation needed - owner directly settles.

---

## Testing Script

```javascript
// test/PepasurSimple.test.js
describe("PepasurSimple", function () {
  it("Should create and play a complete game", async function () {
    const [owner, p1, p2, p3, p4] = await ethers.getSigners();
    const PepasurSimple = await ethers.getContractFactory("PepasurSimple");
    const contract = await PepasurSimple.deploy();

    const stake = ethers.parseEther("1.0");

    // Create game
    await contract.connect(p1).createGame(stake, 4, { value: stake });

    // Join game
    await contract.connect(p2).joinGame(1, { value: stake });
    await contract.connect(p3).joinGame(1, { value: stake });
    await contract.connect(p4).joinGame(1, { value: stake });

    // Settle
    await contract.settleGame(1, [p1.address, p2.address]);

    // Withdraw
    await contract.connect(p1).withdraw();
    const balance = await ethers.provider.getBalance(p1.address);
    expect(balance).to.be.gt(stake); // Profit!
  });
});
```

---

## Comparison: When to Use Which Contract

### Use PepasurSimple When:
✅ Rapid prototyping / MVP
✅ Testing game mechanics
✅ Learning Solidity/Web3
✅ Small-scale deployments
✅ Trust-based environment (owner is trusted)

### Use Pepasur (Full) When:
✅ Production deployment
✅ Public/permissionless games
✅ Decentralized settlement (trustless)
✅ Advanced security requirements
✅ Large-scale operations

---

## Contract Address

After deployment, update:

**Backend (.env):**
```env
PEPASUR_CONTRACT_ADDRESS=0x...
IS_SIMPLE_CONTRACT=true
```

**Frontend (.env):**
```env
NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_IS_SIMPLE=true
```

---

## Troubleshooting

### "Not owner" Error
Only the contract deployer (owner) can call `settleGame()`. Use the owner wallet.

### "No pending withdrawal" Error
Player has no rewards to withdraw. Check with `getPendingWithdrawal()`.

### "Game not in lobby" Error
Game has already started or is settled. Can only join games in LOBBY status.

### "Already joined" Error
Player address is already in this game. Each address can only join once per game.

---

**Ready to deploy!** 🚀

This simplified contract is **much easier to deploy** via Remix and should work without timeout issues.
