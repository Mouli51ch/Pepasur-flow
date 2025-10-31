# Pepasur Smart Contract (Flow EVM)

Pepasur is an on-chain Mafia-style social deduction game with staking and reward distribution. This contract handles game creation, player joining, stake management, server-signed settlements, and withdrawals.

**Migrated from:** Aptos Move
**Target Network:** Flow EVM Testnet
**Solidity Version:** 0.8.20

## Features

- **Game Creation**: Players create lobbies with custom stake amounts
- **Player Joining**: Stake ETH/FLOW to join games
- **Auto-Start**: Games automatically start when minimum players reached
- **Server-Signed Settlements**: EIP-712 signature verification for fair game results
- **Withdrawal Pattern**: Secure pull-based withdrawal mechanism
- **House Fee**: Configurable platform fee (default 2%)
- **Emergency Cancellation**: Game creators can cancel and refund players

## Architecture

### Contract Components

```
Pepasur.sol
├── Game Struct - Store game state (players, stakes, status)
├── Config Struct - Admin settings and server signer
├── Mappings - Track pending withdrawals
├── Events - Emit game lifecycle events
├── Functions
│   ├── Game Management (create, join, settle, cancel)
│   ├── Withdrawals (pull pattern)
│   ├── Admin Functions (update config)
│   └── View Functions (query state)
└── Security
    ├── EIP-712 Signature Verification
    ├── ReentrancyGuard
    └── Custom Errors
```

### Game States

- **LOBBY (0)**: Waiting for players to join
- **IN_PROGRESS (1)**: Game is active, players are playing
- **SETTLED (2)**: Game completed, rewards distributed
- **CANCELLED (3)**: Game cancelled, refunds queued

## Installation

### Prerequisites

- Node.js v18+
- npm or yarn
- Flow EVM Testnet FLOW tokens (from [faucet](https://testnet-faucet.onflow.org/))

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

```env
# Required
DEPLOYER_PRIVATE_KEY=0x...              # Your deployer wallet private key
SERVER_SIGNER_ADDRESS=0x...             # Backend server wallet address
FEE_RECIPIENT_ADDRESS=0x...             # Address to receive house fees

# Optional
FLOW_EVM_RPC_URL=https://testnet.evm.nodes.onflow.org
FLOWSCAN_API_KEY=your_api_key
REPORT_GAS=true
```

## Development

### Compile Contract

```bash
npm run compile
```

This generates:
- `artifacts/` - Compiled contract artifacts
- `typechain-types/` - TypeScript type definitions

### Run Tests

```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run coverage
npm run test:coverage
```

### Local Development

```bash
# Start local Hardhat node
npm run node

# In another terminal, deploy to local network
npm run deploy:local
```

## Deployment

### 1. Deploy Contract

```bash
npm run deploy:testnet
```

This will:
- Deploy Pepasur.sol to Flow EVM Testnet
- Save deployment info to `deployments/flowTestnet-latest.json`
- Display contract address and next steps

Expected output:
```
🚀 Starting Pepasur contract deployment...
✅ Contract deployed successfully!
📊 Deployment Summary:
├─ Contract Address: 0x...
├─ Transaction Hash: 0x...
└─ Total Cost: 0.001234 FLOW
```

### 2. Initialize Contract

```bash
npm run initialize
```

This sets:
- Server signer address (for signature verification)
- Fee recipient address (receives house cut)
- Marks contract as initialized

### 3. Verify Contract

```bash
npm run verify
```

Verifies the contract on FlowScan block explorer.

## Usage

### Creating a Game

```javascript
const stakeAmount = ethers.parseEther("1.0"); // 1 FLOW
const minPlayers = 4;

const tx = await pepasur.createGame(stakeAmount, minPlayers, {
  value: stakeAmount
});
await tx.wait();
```

### Joining a Game

```javascript
const gameId = 1;
const game = await pepasur.getGame(gameId);

const tx = await pepasur.joinGame(gameId, {
  value: game.stakeAmount
});
await tx.wait();
```

### Settling a Game (Backend)

```javascript
const gameId = 1;
const winners = ["0x...", "0x..."];
const payouts = [ethers.parseEther("1.96"), ethers.parseEther("1.96")];

// Create EIP-712 signature
const domain = {
  name: "Pepasur",
  version: "1",
  chainId: 545,
  verifyingContract: contractAddress
};

const types = {
  Settlement: [
    { name: "gameId", type: "uint64" },
    { name: "winners", type: "address[]" },
    { name: "payouts", type: "uint256[]" }
  ]
};

const value = { gameId, winners, payouts };
const signature = await serverWallet.signTypedData(domain, types, value);

// Submit settlement
const tx = await pepasur.settleGame(gameId, winners, payouts, signature);
await tx.wait();
```

### Withdrawing Rewards

```javascript
const tx = await pepasur.withdraw();
await tx.wait();
```

## Contract API

### Game Functions

#### `createGame(uint256 stakeAmount, uint8 minPlayers) payable returns (uint64)`
Create a new game lobby. Creator automatically joins as first player.

**Parameters:**
- `stakeAmount`: Amount each player must stake (in wei)
- `minPlayers`: Minimum players required (2-10)

**Requirements:**
- Must send `msg.value == stakeAmount`
- Contract must be initialized

#### `joinGame(uint64 gameId) payable`
Join an existing game in lobby status.

**Parameters:**
- `gameId`: ID of game to join

**Requirements:**
- Must send exact stake amount
- Game must be in LOBBY status
- Player not already in game

#### `settleGame(uint64 gameId, address[] winners, uint256[] payouts, bytes signature)`
Settle a completed game with server signature.

**Parameters:**
- `gameId`: ID of game to settle
- `winners`: Array of winner addresses
- `payouts`: Array of payout amounts
- `signature`: EIP-712 signature from server signer

**Requirements:**
- Valid signature from authorized server
- Game must be IN_PROGRESS
- Total payouts <= remaining pool (after house fee)

#### `withdraw()`
Withdraw pending rewards.

**Requirements:**
- Must have pending withdrawal > 0

#### `cancelGame(uint64 gameId)`
Cancel a game and refund all players.

**Parameters:**
- `gameId`: ID of game to cancel

**Requirements:**
- Must be game creator
- Game must be LOBBY or IN_PROGRESS

### View Functions

#### `getGame(uint64 gameId) view returns (Game)`
Get complete game information.

#### `getPendingWithdrawal(address player) view returns (uint256)`
Get player's pending withdrawal balance.

#### `getConfig() view returns (Config)`
Get contract configuration.

#### `getNextGameId() view returns (uint64)`
Get next game ID that will be assigned.

#### `getTotalGames() view returns (uint256)`
Get total number of games created.

#### `isPlayerInGame(uint64 gameId, address player) view returns (bool)`
Check if player is in a specific game.

### Admin Functions

#### `initialize(address serverSigner, address feeRecipient)`
One-time post-deployment initialization.

#### `updateServerSigner(address newSigner)`
Update server signer address.

#### `updateFeeRecipient(address newRecipient)`
Update fee recipient address.

#### `updateHouseCut(uint16 newCutBps)`
Update house cut percentage (max 2000 = 20%).

#### `transferAdmin(address newAdmin)`
Transfer admin role to new address.

## Events

```solidity
event GameCreated(uint64 indexed gameId, address indexed creator, uint256 stake, uint8 minPlayers);
event PlayerJoined(uint64 indexed gameId, address indexed player, uint256 playerCount);
event GameStarted(uint64 indexed gameId, uint256 playerCount);
event GameSettled(uint64 indexed gameId, address[] winners, uint256[] payouts, uint256 houseFee);
event Withdrawn(address indexed player, uint256 amount);
event GameCancelled(uint64 indexed gameId, address[] refundedPlayers);
event ConfigUpdated(string parameter, address newValue);
```

## Security

### Signature Verification

Uses EIP-712 typed structured data for settlement verification:
- Domain separator includes contract address and chain ID
- Settlement typehash includes game ID, winners, and payouts
- ECDSA signature recovery verifies server signer

### Reentrancy Protection

Uses OpenZeppelin's `ReentrancyGuard` for:
- `settleGame()`
- `withdraw()`
- `cancelGame()`

### Access Control

- Admin-only functions protected with `NotAuthorized` error
- Server signer verification for settlements
- Creator-only cancellation

### Pull Payments

Withdrawal pattern (pull over push):
- Settlements queue withdrawals
- Players must call `withdraw()` to claim
- Prevents reentrancy and gas issues

## Gas Optimization

- Uses `uint64` for game IDs (sufficient for billions of games)
- Uses `uint8` for player counts (max 10 players)
- Uses `calldata` for arrays in external functions
- Packs structs efficiently
- Events for off-chain data

## Testing

Test coverage includes:
- ✅ Deployment and initialization
- ✅ Game creation with validation
- ✅ Player joining and auto-start
- ✅ EIP-712 signature verification
- ✅ Settlement with house fees
- ✅ Withdrawal mechanism
- ✅ Game cancellation and refunds
- ✅ Admin functions
- ✅ View functions
- ✅ Security (reentrancy, access control)

Run tests:
```bash
npm test
```

## Network Information

### Flow EVM Testnet

- **Chain ID**: 545
- **RPC URL**: https://testnet.evm.nodes.onflow.org
- **Block Explorer**: https://evm-testnet.flowscan.io
- **Faucet**: https://testnet-faucet.onflow.org/
- **Native Token**: FLOW

## Integration

### Backend Integration

Replace `AptosService.js` with `EvmService.js`:

```javascript
const { ethers } = require('ethers');
const PepasurABI = require('./contracts/Pepasur.json');

class EvmService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.FLOW_EVM_RPC_URL
    );
    this.wallet = new ethers.Wallet(
      process.env.SERVER_PRIVATE_KEY,
      this.provider
    );
    this.contract = new ethers.Contract(
      process.env.PEPASUR_CONTRACT_ADDRESS,
      PepasurABI.abi,
      this.wallet
    );
  }

  async settleGame(gameId, winners, payouts) {
    // Create EIP-712 signature
    const domain = {
      name: "Pepasur",
      version: "1",
      chainId: 545,
      verifyingContract: this.contract.address
    };

    const types = {
      Settlement: [
        { name: "gameId", type: "uint64" },
        { name: "winners", type: "address[]" },
        { name: "payouts", type: "uint256[]" }
      ]
    };

    const value = { gameId, winners, payouts };
    const signature = await this.wallet.signTypedData(domain, types, value);

    const tx = await this.contract.settleGame(gameId, winners, payouts, signature);
    return await tx.wait();
  }
}
```

### Frontend Integration

Use wagmi + RainbowKit for wallet connections:

```typescript
import { useContractWrite } from 'wagmi';
import PepasurABI from './contracts/Pepasur.json';

function CreateGame() {
  const { write } = useContractWrite({
    address: process.env.NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS,
    abi: PepasurABI.abi,
    functionName: 'createGame',
  });

  const handleCreate = () => {
    write({
      args: [parseEther("1.0"), 4],
      value: parseEther("1.0")
    });
  };

  return <button onClick={handleCreate}>Create Game</button>;
}
```

## Troubleshooting

### Deployment Issues

**"Insufficient funds"**
- Get testnet FLOW from: https://testnet-faucet.onflow.org/
- Check balance: `await provider.getBalance(address)`

**"Nonce too low/high"**
- Reset account: Delete `~/.hardhat/` cache
- Or manually set nonce in transaction

### Signature Verification Failures

**"Invalid signature"**
- Ensure server signer address matches initialized address
- Verify EIP-712 domain matches contract address and chain ID
- Check signature is from correct private key

### Transaction Reverts

**"Game not found"**
- Game ID starts at 1, not 0
- Use `getNextGameId()` to check valid range

**"Incorrect stake amount"**
- Must send exact `msg.value == game.stakeAmount`
- Use `getGame()` to check required stake

## License

MIT

## Support

- Documentation: See `MIGRATION_PLAN.md`
- Issues: GitHub Issues
- Flow EVM Docs: https://developers.flow.com/evm/
