# PEPASUR - Mafia Game on Flow EVM Testnet

![PEPASUR Banner](https://img.shields.io/badge/Flow-EVM%20Testnet-00EF8B?style=for-the-badge)
![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=for-the-badge&logo=solidity)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js)

**PEPASUR** is a blockchain-based multiplayer Mafia game built on Flow EVM Testnet. Players stake FLOW tokens to enter games, engage in strategic social deduction gameplay, and winners share 98% of the prize pool.

## 🎥 Demo Video

[![PEPASUR Demo on Flow EVM](https://img.youtube.com/vi/paaP_X7KJk4/maxresdefault.jpg)](https://www.youtube.com/watch?v=paaP_X7KJk4)

**Watch the full gameplay demo**: [PEPASUR on Flow EVM Testnet](https://www.youtube.com/watch?v=paaP_X7KJk4)

## 🎮 Game Overview

PEPASUR (Asur means demon in Hindi) brings the classic Mafia party game to the blockchain with real crypto stakes. Players are secretly assigned roles (Villagers, Mafia, Detective, Doctor) and must work together or deceive to eliminate the opposing team.

### Key Features

- **On-Chain Staking**: Players stake FLOW tokens to join games
- **Real-Time Gameplay**: Socket.io powered real-time communication
- **Smart Contract Rewards**: Automated reward distribution via smart contracts
- **Multiple Roles**: Detective, Doctor, Mafia, and Villagers
- **Day/Night Phases**: Strategic voting and night actions
- **Pull-Payment Pattern**: Secure reward withdrawal system

## 📋 Smart Contract Details

### Deployed Contract

- **Contract Name**: PepasurSimpleFixed
- **Network**: Flow EVM Testnet
- **Chain ID**: 545
- **Contract Address**: `0x812A9dC833b4595ef80d30d74342b79C9f5a9912`
- **Explorer**: [View on FlowScan](https://evm-testnet.flowscan.io/address/0x812A9dC833b4595ef80d30d74342b79C9f5a9912)
- **RPC URL**: https://testnet.evm.nodes.onflow.org

### Contract Features

- ✅ **4-Player Support**: Optimized for 4-player games
- ✅ **Game State Management**: LOBBY → READY → IN_PROGRESS → SETTLED
- ✅ **Manual Game Start**: Owner/creator can start games
- ✅ **Auto-Start**: Games automatically start when max players reached
- ✅ **Reward Distribution**: 98% to winners, 2% house fee
- ✅ **Pull Payments**: Safe withdrawal pattern for claiming rewards
- ✅ **Emergency Refund**: Owner can refund games if needed

### Core Functions

```solidity
// Create a new game
function createGame(uint256 stakeAmount, uint8 minPlayers, uint8 maxPlayers) external payable

// Join an existing game
function joinGame(uint64 gameId) external payable

// Start game (owner/creator only)
function startGame(uint64 gameId) external

// Settle game and distribute rewards (owner only)
function settleGame(uint64 gameId, address[] calldata winners) external

// Withdraw winnings
function withdraw() external

// Check pending withdrawal
function getPendingWithdrawal(address player) external view returns (uint256)
```

## 🏗️ Project Structure

```
pepasur-flow/
├── contract-flow/           # Smart contracts
│   ├── contracts/
│   │   └── PepasurSimpleFixed.sol
│   ├── scripts/
│   │   └── deploy-fixed.js
│   └── hardhat.config.js
│
├── PepasurAptos/
│   ├── backend/            # Node.js backend
│   │   ├── services/
│   │   │   ├── EvmServiceSimple.js    # Blockchain interaction
│   │   │   ├── GameManager.js          # Game logic
│   │   │   └── StakingService.js       # Staking management
│   │   ├── routes/
│   │   └── server.js
│   │
│   └── frontend/           # Next.js frontend
│       ├── app/
│       ├── components/
│       ├── services/
│       └── public/
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB instance
- Flow EVM Testnet FLOW tokens ([Get from Faucet](https://previewnet-faucet.onflow.org/))
- MetaMask or compatible Web3 wallet

### 1. Clone Repository

```bash
git clone https://github.com/Mouli51ch/Pepasur-flow.git
cd Pepasur-flow
```

### 2. Smart Contract Setup

```bash
cd contract-flow
npm install

# Configure your private key in hardhat.config.js
# Deploy contract (optional - already deployed)
npx hardhat run scripts/deploy-fixed.js --network flowTestnet
```

### 3. Backend Setup

```bash
cd PepasurAptos/backend
npm install

# Create .env file
cat > .env << EOL
FLOW_EVM_RPC_URL=https://testnet.evm.nodes.onflow.org
CHAIN_ID=545
PEPASUR_CONTRACT_ADDRESS=0x812A9dC833b4595ef80d30d74342b79C9f5a9912
SERVER_PRIVATE_KEY=your_private_key_here
SERVER_ADDRESS=your_wallet_address_here
PORT=3001
HOST=0.0.0.0
MONGODB_URI=your_mongodb_uri_here
NETWORK=flow-testnet
EOL

# Start backend
npm run dev
```

### 4. Frontend Setup

```bash
cd PepasurAptos/frontend
npm install

# Create .env.local file
cat > .env.local << EOL
NEXT_PUBLIC_FLOW_EVM_RPC=https://testnet.evm.nodes.onflow.org
NEXT_PUBLIC_CHAIN_ID=545
NEXT_PUBLIC_NETWORK_NAME=Flow EVM Testnet
NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=0x812A9dC833b4595ef80d30d74342b79C9f5a9912
NEXT_PUBLIC_IS_SIMPLE=true
NEXT_PUBLIC_BLOCK_EXPLORER=https://evm-testnet.flowscan.io
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
EOL

# Build and start frontend
npm run build
npm run dev
```

### 5. Add Flow EVM Testnet to MetaMask

- **Network Name**: Flow EVM Testnet
- **RPC URL**: https://testnet.evm.nodes.onflow.org
- **Chain ID**: 545
- **Currency Symbol**: FLOW
- **Block Explorer**: https://evm-testnet.flowscan.io

## 🎯 How to Play

### Game Setup

1. **Connect Wallet**: Connect your MetaMask wallet to Flow EVM Testnet
2. **Get Testnet FLOW**: Obtain testnet FLOW from the faucet
3. **Create/Join Game**: Create a new game or join existing one with room code
4. **Stake FLOW**: Approve and stake your FLOW tokens (e.g., 0.001 FLOW)
5. **Wait for Players**: Game starts when minimum players (4) join

### Gameplay

#### Roles

- **Villagers**: Vote to eliminate suspected Mafia during day phase
- **Mafia**: Eliminate villagers at night, blend in during day
- **Detective**: Investigate one player each night to learn their role
- **Doctor**: Protect one player from Mafia elimination each night

#### Phases

1. **Night Phase** (30s):
   - Mafia chooses a target to eliminate
   - Detective investigates a player
   - Doctor chooses a player to protect

2. **Day Phase** (60s):
   - Discussion and voting
   - Players vote to eliminate a suspected Mafia member
   - Player with most votes is eliminated

3. **Game End**:
   - Villagers win if all Mafia are eliminated
   - Mafia wins if they equal or outnumber Villagers

### Rewards

- **Total Pool**: Sum of all player stakes (4 players × 0.001 FLOW = 0.004 FLOW)
- **House Fee**: 2% (0.00008 FLOW)
- **Reward Pool**: 98% (0.00392 FLOW)
- **Winner Share**: Reward pool divided equally among winners

Example for 4-player game with 0.001 FLOW stake:
- Total Pool: 0.004 FLOW
- House Fee: 0.00008 FLOW
- Winners (if 3 villagers win): 0.00392 FLOW ÷ 3 ≈ 0.00131 FLOW each

## 🔧 Technical Architecture

### Tech Stack

**Frontend**:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- ethers.js v6
- Socket.io-client

**Backend**:
- Node.js + Express
- Socket.io (real-time communication)
- MongoDB (game state persistence)
- ethers.js (blockchain interaction)

**Smart Contract**:
- Solidity 0.8.28
- Hardhat development framework
- OpenZeppelin Ownable

### Key Components

1. **EvmServiceSimple.js**: Handles all blockchain interactions
   - Transaction management
   - Game state queries
   - Settlement execution

2. **GameManager.js**: Core game logic
   - Player management
   - Phase transitions
   - Vote counting
   - Role assignment

3. **StakingService.js**: Reward calculations
   - Stake tracking
   - Reward distribution logic
   - BigInt arithmetic for Wei amounts

4. **Smart Contract**: On-chain game management
   - State machine (LOBBY → READY → IN_PROGRESS → SETTLED)
   - Pull-payment rewards
   - Access control

## 🔐 Security Features

- **Pull Payment Pattern**: Players withdraw rewards themselves (prevents reentrancy)
- **Access Control**: Only owner can settle games
- **State Validation**: Strict game state transitions
- **BigInt Arithmetic**: Prevents overflow/underflow in JavaScript
- **Input Validation**: Player count, stake amounts validated
- **Emergency Functions**: Owner can refund games if needed

## 📊 Game Statistics

- **Min Players**: 4
- **Max Players**: 10 (configurable)
- **Default Stake**: 0.001 FLOW (configurable)
- **House Fee**: 2%
- **Night Phase**: 30 seconds
- **Day Phase**: 60 seconds

## 🛠️ Development

### Run Tests

```bash
cd contract-flow
npx hardhat test
```

### Deploy New Contract

```bash
npx hardhat run scripts/deploy-fixed.js --network flowTestnet
```

### Development Mode

```bash
# Terminal 1: Backend
cd PepasurAptos/backend
npm run dev

# Terminal 2: Frontend
cd PepasurAptos/frontend
npm run dev
```

## 🐛 Known Issues & Fixes

- ✅ **Fixed**: String concatenation bug in totalStaked calculation
- ✅ **Fixed**: BigInt conversion errors in reward distribution
- ✅ **Fixed**: Transaction receipt timing issues
- ✅ **Fixed**: Game state synchronization between backend and contract

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🔗 Links

- **Contract Address**: [0x812A9dC833b4595ef80d30d74342b79C9f5a9912](https://evm-testnet.flowscan.io/address/0x812A9dC833b4595ef80d30d74342b79C9f5a9912)
- **Flow Docs**: https://docs.onflow.org/
- **Flow EVM Testnet Faucet**: https://previewnet-faucet.onflow.org/
- **GitHub**: https://github.com/Mouli51ch/Pepasur-flow

## 👥 Team

Developed for Flow blockchain hackathon/project.

## 🙏 Acknowledgments

- Flow blockchain team for EVM compatibility
- OpenZeppelin for secure smart contract libraries
- Community for testing and feedback

---

**⚠️ Disclaimer**: This is a testnet deployment. Do not use real funds. Always verify contract addresses before interacting.

**🎮 Ready to play?** Get some testnet FLOW and join the game!
