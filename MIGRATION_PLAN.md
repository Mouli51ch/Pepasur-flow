# Pepasur Migration Plan: Aptos → Flow EVM Testnet

**Version:** 1.0
**Date:** October 30, 2025
**Status:** Planning Phase

---

## Executive Summary

This document outlines the comprehensive migration strategy for Pepasur, an on-chain Mafia-style game, from Aptos blockchain to Flow EVM Testnet. The migration maintains feature parity while leveraging EVM-compatible tooling and Flow's infrastructure.

### Migration Scope
- **Smart Contract:** Move → Solidity (445 lines)
- **Backend:** Aptos SDK → ethers.js/viem (4 files, ~500 lines)
- **Frontend:** Aptos Wallet Adapter → EVM wallets (2 files, ~150 lines)
- **Deployment:** Aptos CLI → Hardhat/Foundry
- **Network:** Aptos Devnet → Flow EVM Testnet

---

## Phase 1: Smart Contract Migration

### 1.1 Contract Architecture Analysis

**Current Aptos Contract Structure (pepasur.move):**
```
Module: pepasur::pepasur
├── Structs (Resources)
│   ├── Game (store, drop) - Game state
│   ├── GameStore (key) - Global storage with vault
│   ├── Config (key) - Admin configuration
│   └── PendingWithdrawals (key) - Withdrawal queue
├── Events (6 total)
│   ├── GameCreated, PlayerJoined, GameStarted
│   ├── GameSettled, Withdrawn, GameCancelled
├── Entry Functions (9 total)
│   ├── initialize() - Post-deployment setup
│   ├── create_game() - Create game lobby
│   ├── join_game() - Join with stake
│   ├── settle_game() - Server-signed settlement
│   ├── withdraw() - Claim winnings
│   ├── cancel_game() - Emergency cancellation
│   └── 3 admin functions (update config)
└── View Functions (4 total)
    ├── get_game() - Game details
    ├── get_pending_withdrawal() - Check balance
    ├── get_config() - Contract config
    └── get_next_game_id() - Next game ID
```

**Key Technical Features:**
1. **Resource Model** - Move uses resource types stored at account addresses
2. **ED25519 Signatures** - Server-signed settlements with cryptographic verification
3. **BCS Serialization** - Binary Canonical Serialization for message signing
4. **Coin Management** - Native Coin<AptosCoin> types with vault pattern
5. **Event Emission** - Structured event system with indexed fields

### 1.2 Solidity Migration Strategy

**Target Contract: `Pepasur.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Pepasur {
    // Enums for game status
    enum GameStatus { LOBBY, IN_PROGRESS, SETTLED, CANCELLED }

    // Structs
    struct Game {
        uint64 id;
        address creator;
        uint256 stakeAmount;
        uint8 minPlayers;
        address[] players;
        uint256[] deposits;
        GameStatus status;
        uint256 totalPool;
        uint256 createdAt;
    }

    struct Config {
        address admin;
        address serverSigner;  // Address instead of pubkey
        address feeRecipient;
        uint16 houseCutBps;    // Basis points (200 = 2%)
        bool initialized;
    }

    // State variables (replacing Move resources)
    Game[] public games;
    uint64 public nextGameId = 1;
    Config public config;
    mapping(address => uint256) public pendingWithdrawals;

    // Events (same as Move)
    event GameCreated(uint64 indexed gameId, address indexed creator, uint256 stake, uint8 minPlayers);
    event PlayerJoined(uint64 indexed gameId, address indexed player);
    event GameStarted(uint64 indexed gameId, uint256 playerCount);
    event GameSettled(uint64 indexed gameId, address[] winners, uint256[] payouts, uint256 houseFee);
    event Withdrawn(address indexed player, uint256 amount);
    event GameCancelled(uint64 indexed gameId, address[] refundedPlayers);

    // Core functions (see detailed implementation below)
    function createGame(uint256 stakeAmount, uint8 minPlayers) external payable;
    function joinGame(uint64 gameId) external payable;
    function settleGame(uint64 gameId, address[] calldata winners, uint256[] calldata payouts, bytes calldata signature) external;
    function withdraw() external;
    function cancelGame(uint64 gameId) external;
}
```

**Migration Challenges & Solutions:**

| Challenge | Aptos Approach | Flow EVM Solution |
|-----------|---------------|-------------------|
| **Resource Storage** | Resources stored at module address | Contract state variables + arrays |
| **Signature Verification** | ED25519 via `ed25519::signature_verify_strict()` | ECDSA via `ecrecover()` + EIP-712 |
| **Message Signing** | BCS serialization | `abi.encodePacked()` or EIP-712 structured data |
| **Native Coin** | `Coin<AptosCoin>` type | Native ETH/FLOW via `msg.value` |
| **Vault Pattern** | `Coin<AptosCoin>` in GameStore | Contract balance tracking |
| **View Functions** | `#[view]` annotation | `view` function modifier |
| **Initialization** | `init_module()` auto-called | `constructor()` + manual init |

### 1.3 Signature Verification Migration

**Critical Change: ED25519 → ECDSA (secp256k1)**

Aptos (ED25519):
```move
// Message: BCS(game_id) || BCS(winners) || BCS(payouts)
// Signature: 64 bytes ED25519 signature
// Public Key: 32 bytes stored in Config
fun verify_signature(message: &vector<u8>, signature: &vector<u8>, public_key: &vector<u8>) {
    let pk = ed25519::new_unvalidated_public_key_from_bytes(*public_key);
    let sig = ed25519::new_signature_from_bytes(*signature);
    assert!(ed25519::signature_verify_strict(&sig, &pk, *message), EINVALID_SIGNATURE);
}
```

Flow EVM (ECDSA + EIP-712):
```solidity
// Option 1: Simple hash signing
function verifySignature(
    uint64 gameId,
    address[] memory winners,
    uint256[] memory payouts,
    bytes memory signature
) internal view returns (bool) {
    bytes32 messageHash = keccak256(abi.encodePacked(gameId, winners, payouts));
    bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    address recoveredSigner = recoverSigner(ethSignedMessageHash, signature);
    return recoveredSigner == config.serverSigner;
}

// Option 2: EIP-712 (recommended for frontend compatibility)
bytes32 private constant SETTLEMENT_TYPEHASH = keccak256(
    "Settlement(uint64 gameId,address[] winners,uint256[] payouts)"
);

function verifySettlement(
    uint64 gameId,
    address[] memory winners,
    uint256[] memory payouts,
    bytes memory signature
) internal view returns (bool) {
    bytes32 structHash = keccak256(abi.encode(
        SETTLEMENT_TYPEHASH,
        gameId,
        keccak256(abi.encodePacked(winners)),
        keccak256(abi.encodePacked(payouts))
    ));
    bytes32 digest = _hashTypedDataV4(structHash);
    address recoveredSigner = ECDSA.recover(digest, signature);
    return recoveredSigner == config.serverSigner;
}
```

**Backend Signing Changes:**
- Replace ED25519 private key with secp256k1 private key
- Use ethers.js `Wallet.signMessage()` or EIP-712 signing
- Update message construction to match Solidity encoding

### 1.4 Contract Deployment Plan

**Tools:** Hardhat (recommended) or Foundry

**Directory Structure:**
```
contract/
├── contracts/
│   ├── Pepasur.sol          # Main game contract
│   └── interfaces/
│       └── IPepasur.sol     # Interface for external calls
├── scripts/
│   ├── deploy.js            # Deployment script
│   ├── initialize.js        # Post-deployment initialization
│   └── verify.js            # Block explorer verification
├── test/
│   ├── Pepasur.test.js      # Unit tests
│   └── integration/
│       └── gameplay.test.js # Full game flow tests
├── hardhat.config.js        # Hardhat configuration
├── .env.example             # Environment template
└── README.md                # Contract documentation
```

**Deployment Steps:**
1. Compile contract: `npx hardhat compile`
2. Deploy to Flow EVM Testnet: `npx hardhat run scripts/deploy.js --network flowTestnet`
3. Initialize contract with server signer address
4. Verify on explorer: `npx hardhat verify --network flowTestnet <address>`

**Network Configuration (hardhat.config.js):**
```javascript
module.exports = {
  networks: {
    flowTestnet: {
      url: "https://testnet.evm.nodes.onflow.org",
      chainId: 545,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      gasPrice: 1000000000, // 1 gwei
    }
  },
  etherscan: {
    apiKey: process.env.FLOWSCAN_API_KEY,
    customChains: [{
      network: "flowTestnet",
      chainId: 545,
      urls: {
        apiURL: "https://evm-testnet.flowscan.io/api",
        browserURL: "https://evm-testnet.flowscan.io"
      }
    }]
  }
}
```

---

## Phase 2: Backend Migration

### 2.1 AptosService → EvmService

**File Changes:**
- `backend/services/AptosService.js` → `backend/services/EvmService.js`
- Update all blockchain interaction code
- Maintain same interface for GameManager compatibility

**Current Dependencies:**
```json
{
  "@aptos-labs/ts-sdk": "^5.1.1",
  "ethers": "^6.8.1"  // Already present but unused
}
```

**New Dependencies:**
```json
{
  "ethers": "^6.8.1",           // Primary library
  "viem": "^2.38.4",            // Optional alternative
  "@openzeppelin/contracts": "^5.0.0"  // For contract imports if needed
}
```

### 2.2 Function Mapping

| Aptos Function | EVM Equivalent | Changes Required |
|----------------|----------------|------------------|
| `initialize()` | `new ethers.JsonRpcProvider()` | Change network URL |
| `Account.fromPrivateKey()` | `new ethers.Wallet(privateKey, provider)` | Different key format |
| `aptos.transaction.build.simple()` | `contract.createGame()` | Direct contract calls |
| `signAndSubmitTransaction()` | `wallet.sendTransaction()` | Unified signing |
| `waitForTransaction()` | `provider.waitForTransaction()` | Similar pattern |
| `aptos.view()` | `contract.getGame()` | Direct read calls |
| `ed25519.sign()` | `wallet.signMessage()` or EIP-712 | Different curve |
| `Serializer/BCS` | `ethers.AbiCoder.encode()` | Different encoding |

### 2.3 EvmService Implementation

**Key Methods:**

```javascript
const { ethers } = require('ethers');

class EvmService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.initialize();
  }

  async initialize() {
    // Connect to Flow EVM Testnet
    this.provider = new ethers.JsonRpcProvider(
      process.env.FLOW_EVM_RPC_URL || "https://testnet.evm.nodes.onflow.org"
    );

    // Initialize server wallet
    if (process.env.SERVER_PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.SERVER_PRIVATE_KEY, this.provider);
      console.log('🔑 Server wallet:', this.wallet.address);
    }

    // Load contract
    const contractABI = require('../contracts/Pepasur.json').abi;
    this.contract = new ethers.Contract(
      process.env.PEPASUR_CONTRACT_ADDRESS,
      contractABI,
      this.wallet
    );
  }

  async createGame(stakeAmount, minPlayers) {
    // Direct contract call with value
    const tx = await this.contract.createGame(stakeAmount, minPlayers, {
      value: stakeAmount  // Send stake with transaction
    });
    const receipt = await tx.wait();

    // Extract game ID from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed.name === 'GameCreated';
      } catch { return false; }
    });
    const parsed = this.contract.interface.parseLog(event);
    return parsed.args.gameId;
  }

  async joinGame(gameId, playerAddress) {
    // Note: This would be called by player's wallet, not server
    // Server may need to facilitate or verify
    const game = await this.contract.games(gameId - 1);
    const tx = await this.contract.joinGame(gameId, {
      value: game.stakeAmount
    });
    return await tx.wait();
  }

  async submitSettlement(gameId, winners, payoutAmounts) {
    // Sign settlement message (EIP-712)
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

    const value = { gameId, winners, payouts: payoutAmounts };
    const signature = await this.wallet.signTypedData(domain, types, value);

    // Submit settlement
    const tx = await this.contract.settleGame(gameId, winners, payoutAmounts, signature);
    return await tx.wait();
  }

  async getGameInfo(gameId) {
    return await this.contract.getGame(gameId);
  }

  async withdraw(playerAddress) {
    // Would be called by player, not server
    const tx = await this.contract.withdraw();
    return await tx.wait();
  }
}
```

### 2.4 Environment Variable Changes

**Before (Aptos):**
```env
APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com
PEPASUR_APTOS_CONTRACT_ADDRESS=0x...
SERVER_PRIVATE_KEY=ed25519-priv-0x...  # ED25519 key
NETWORK=devnet
```

**After (Flow EVM):**
```env
FLOW_EVM_RPC_URL=https://testnet.evm.nodes.onflow.org
PEPASUR_CONTRACT_ADDRESS=0x...         # EVM address (20 bytes)
SERVER_PRIVATE_KEY=0x...               # ECDSA secp256k1 key (32 bytes hex)
CHAIN_ID=545
NETWORK=flow-testnet
```

### 2.5 Backend Testing Strategy

1. **Unit Tests:** Mock contract calls with ethers.js test utilities
2. **Integration Tests:** Deploy to Flow EVM Testnet, test full game flow
3. **Signature Verification:** Ensure backend signing matches contract verification
4. **Gas Optimization:** Profile gas costs for all operations

---

## Phase 3: Frontend Migration

### 3.1 Wallet Adapter Replacement

**Current Stack:**
```json
{
  "@aptos-labs/ts-sdk": "^1.39.0",
  "@aptos-labs/wallet-adapter-react": "^7.1.3",
  "@aptos-labs/wallet-adapter-ant-design": "^5.2.3"
}
```

**Target Stack (Option 1: wagmi + RainbowKit):**
```json
{
  "wagmi": "^2.18.2",              // React hooks for Ethereum
  "viem": "^2.38.4",               // Low-level Ethereum library
  "@rainbow-me/rainbowkit": "^2.0.0"  // Wallet UI
}
```

**Target Stack (Option 2: Web3Modal v3):**
```json
{
  "@web3modal/ethers": "^4.0.0",
  "ethers": "^6.8.1"
}
```

**Recommendation:** Use wagmi + RainbowKit for better DX and Flow EVM support

### 3.2 Provider Configuration

**Before (providers.tsx):**
```typescript
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';

export function Providers({ children }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{ network: Network.TESTNET }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
```

**After (providers.tsx):**
```typescript
import { WagmiProvider, createConfig, http } from 'wagmi';
import { flowTestnet } from 'wagmi/chains';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Define Flow EVM Testnet (not in wagmi by default)
const flowEvmTestnet = {
  id: 545,
  name: 'Flow EVM Testnet',
  network: 'flow-testnet',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.evm.nodes.onflow.org'] },
    public: { http: ['https://testnet.evm.nodes.onflow.org'] }
  },
  blockExplorers: {
    default: { name: 'FlowScan', url: 'https://evm-testnet.flowscan.io' }
  },
  testnet: true
};

const config = createConfig({
  chains: [flowEvmTestnet],
  transports: {
    [flowEvmTestnet.id]: http()
  }
});

export function Providers({ children }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
```

### 3.3 Wallet Connection Component

**Before (wallet-connect.tsx):**
```typescript
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design';

export default function WalletConnect({ onAddressChange }) {
  const { account, connected, disconnect } = useWallet();
  const address = account?.address.toString();

  return (
    <div>
      {!connected ? <WalletSelector /> : <div>{address}</div>}
    </div>
  );
}
```

**After (wallet-connect.tsx):**
```typescript
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';

export default function WalletConnect({ onAddressChange }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    onAddressChange(isConnected ? address : null);
  }, [address, isConnected]);

  return (
    <div>
      {!isConnected ? <ConnectButton /> : <div>{address}</div>}
    </div>
  );
}
```

### 3.4 Contract Interaction Hooks

**Create custom hooks for game interactions:**

```typescript
// hooks/usePepasurContract.ts
import { useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import PepasurABI from '@/contracts/Pepasur.json';

const contractAddress = process.env.NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS;

export function useCreateGame() {
  const { write, data } = useContractWrite({
    address: contractAddress,
    abi: PepasurABI.abi,
    functionName: 'createGame'
  });

  const { isLoading, isSuccess } = useWaitForTransaction({ hash: data?.hash });

  return { createGame: write, isLoading, isSuccess };
}

export function useJoinGame(gameId: number) {
  const { data: game } = useContractRead({
    address: contractAddress,
    abi: PepasurABI.abi,
    functionName: 'games',
    args: [gameId - 1]
  });

  const { write, data } = useContractWrite({
    address: contractAddress,
    abi: PepasurABI.abi,
    functionName: 'joinGame',
    args: [gameId],
    value: game?.stakeAmount
  });

  return { joinGame: write };
}

export function useWithdraw() {
  const { write } = useContractWrite({
    address: contractAddress,
    abi: PepasurABI.abi,
    functionName: 'withdraw'
  });

  return { withdraw: write };
}
```

### 3.5 Frontend Environment Variables

**Before:**
```env
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com
NEXT_PUBLIC_APTOS_NETWORK=devnet
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

**After:**
```env
NEXT_PUBLIC_FLOW_EVM_RPC=https://testnet.evm.nodes.onflow.org
NEXT_PUBLIC_CHAIN_ID=545
NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_BLOCK_EXPLORER=https://evm-testnet.flowscan.io
```

---

## Phase 4: Testing & Deployment

### 4.1 Testing Strategy

**Contract Testing:**
```bash
cd contract
npx hardhat test                      # Run all tests
npx hardhat coverage                  # Coverage report
npx hardhat test --grep "settlement"  # Test specific feature
```

**Backend Testing:**
```bash
cd backend
npm test                              # Unit tests
npm run test:integration              # Integration with testnet
```

**Frontend Testing:**
```bash
cd frontend
npm run test                          # Component tests
npm run test:e2e                      # End-to-end with Playwright
```

### 4.2 Deployment Checklist

- [ ] Deploy Pepasur.sol to Flow EVM Testnet
- [ ] Verify contract on FlowScan explorer
- [ ] Initialize contract with server signer address
- [ ] Update backend .env with contract address
- [ ] Generate new ECDSA private key for server
- [ ] Update frontend .env with contract address
- [ ] Deploy backend to production server
- [ ] Deploy frontend to Vercel/hosting platform
- [ ] Test full game flow on testnet
- [ ] Monitor gas costs and optimize
- [ ] Set up error monitoring (Sentry)

### 4.3 Deployment Scripts

**Backend deployment (backend/.env):**
```bash
cp .env.example .env
# Fill in: SERVER_PRIVATE_KEY, PEPASUR_CONTRACT_ADDRESS, MONGODB_URI
npm install
npm start
```

**Frontend deployment (Vercel):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from frontend/
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard
```

---

## Phase 5: Migration Execution Plan

### Timeline (Estimated: 2-3 weeks)

**Week 1: Smart Contract & Backend**
- Days 1-2: Write Pepasur.sol with all functions
- Day 3: Write deployment and test scripts
- Day 4: Deploy to Flow EVM Testnet, verify
- Days 5-7: Migrate EvmService.js, update signing logic

**Week 2: Frontend & Integration**
- Days 1-2: Replace wallet adapters, test connections
- Days 3-4: Update contract interaction hooks
- Day 5: Integration testing (backend + frontend + contract)
- Days 6-7: Bug fixes and optimizations

**Week 3: Testing & Launch**
- Days 1-3: Full end-to-end testing on testnet
- Days 4-5: Security audit of smart contract
- Day 6: Production deployment
- Day 7: Monitoring and hot fixes

### Success Criteria

- [ ] All 9 contract functions working correctly
- [ ] Signature verification passing on-chain
- [ ] Backend can create games, process settlements
- [ ] Frontend can connect MetaMask and other wallets
- [ ] Full game playthrough works on Flow EVM Testnet
- [ ] Gas costs are acceptable (< 0.1 FLOW per game)
- [ ] No critical security vulnerabilities
- [ ] Documentation updated for all components

---

## Phase 6: Risk Assessment & Mitigation

### High-Risk Items

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Signature verification fails** | Critical | Medium | Thorough testing of signing/verification, use EIP-712 standard |
| **Gas costs too high** | High | Low | Optimize Solidity, batch operations, use events wisely |
| **Contract vulnerability** | Critical | Low | Professional audit, use OpenZeppelin contracts |
| **Network congestion** | Medium | Low | Implement retry logic, adjust gas prices dynamically |
| **Wallet compatibility issues** | Medium | Medium | Test with MetaMask, WalletConnect, Coinbase Wallet |

### Rollback Plan

If critical issues arise post-deployment:
1. Keep Aptos version running in parallel initially
2. Add contract pause mechanism in Solidity
3. Deploy bug fix to new contract address
4. Migrate state if necessary (emergency migration function)

---

## Phase 7: Post-Migration Optimizations

### Gas Optimization Opportunities

1. **Use `uint256` instead of smaller types** - EVM word size optimization
2. **Pack structs efficiently** - Reduce storage slots
3. **Use events for off-chain data** - Don't store unnecessary data on-chain
4. **Batch operations** - Combine multiple writes in single transaction
5. **Use `calldata` for arrays** - Cheaper than `memory` for external functions

### Enhanced Features (Post-Migration)

1. **EIP-2612 Permit** - Gasless approvals for ERC-20 if using token instead of native
2. **Meta-transactions** - Allow gasless gameplay for users
3. **Layer 2 Consideration** - Evaluate Flow's scaling solutions
4. **Cross-chain Bridge** - Allow APT holders to bridge to Flow
5. **Enhanced Analytics** - Leverage The Graph for indexing

---

## Appendix A: Code Snippets

### Complete Solidity Contract Outline

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract Pepasur is EIP712 {
    using ECDSA for bytes32;

    enum GameStatus { LOBBY, IN_PROGRESS, SETTLED, CANCELLED }

    struct Game {
        uint64 id;
        address creator;
        uint256 stakeAmount;
        uint8 minPlayers;
        address[] players;
        uint256[] deposits;
        GameStatus status;
        uint256 totalPool;
        uint256 createdAt;
    }

    struct Config {
        address admin;
        address serverSigner;
        address feeRecipient;
        uint16 houseCutBps;
        bool initialized;
    }

    Game[] public games;
    uint64 public nextGameId = 1;
    Config public config;
    mapping(address => uint256) public pendingWithdrawals;

    bytes32 private constant SETTLEMENT_TYPEHASH = keccak256(
        "Settlement(uint64 gameId,address[] winners,uint256[] payouts)"
    );

    constructor() EIP712("Pepasur", "1") {
        config.admin = msg.sender;
        config.feeRecipient = msg.sender;
        config.houseCutBps = 200; // 2%
    }

    function initialize(address _serverSigner, address _feeRecipient) external {
        require(!config.initialized, "Already initialized");
        require(msg.sender == config.admin, "Not admin");
        config.serverSigner = _serverSigner;
        config.feeRecipient = _feeRecipient;
        config.initialized = true;
    }

    function createGame(uint256 stakeAmount, uint8 minPlayers) external payable {
        require(stakeAmount > 0, "Invalid stake");
        require(minPlayers >= 2, "Min 2 players");
        require(msg.value == stakeAmount, "Incorrect stake");

        uint64 gameId = nextGameId++;

        Game storage game = games.push();
        game.id = gameId;
        game.creator = msg.sender;
        game.stakeAmount = stakeAmount;
        game.minPlayers = minPlayers;
        game.status = GameStatus.LOBBY;
        game.createdAt = block.timestamp;

        // Creator automatically joins
        game.players.push(msg.sender);
        game.deposits.push(stakeAmount);
        game.totalPool = stakeAmount;

        emit GameCreated(gameId, msg.sender, stakeAmount, minPlayers);
    }

    function joinGame(uint64 gameId) external payable {
        require(gameId > 0 && gameId < nextGameId, "Game not found");
        Game storage game = games[gameId - 1];

        require(game.status == GameStatus.LOBBY, "Game not in lobby");
        require(msg.value == game.stakeAmount, "Incorrect stake");

        game.players.push(msg.sender);
        game.deposits.push(msg.value);
        game.totalPool += msg.value;

        emit PlayerJoined(gameId, msg.sender);

        if (game.players.length >= game.minPlayers) {
            game.status = GameStatus.IN_PROGRESS;
            emit GameStarted(gameId, game.players.length);
        }
    }

    function settleGame(
        uint64 gameId,
        address[] calldata winners,
        uint256[] calldata payouts,
        bytes calldata signature
    ) external {
        require(gameId > 0 && gameId < nextGameId, "Game not found");
        Game storage game = games[gameId - 1];

        require(game.status == GameStatus.IN_PROGRESS, "Game not in progress");
        require(winners.length == payouts.length, "Length mismatch");

        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            SETTLEMENT_TYPEHASH,
            gameId,
            keccak256(abi.encodePacked(winners)),
            keccak256(abi.encodePacked(payouts))
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        require(signer == config.serverSigner, "Invalid signature");

        // Calculate house fee
        uint256 houseFee = (game.totalPool * config.houseCutBps) / 10000;
        uint256 remainingPool = game.totalPool - houseFee;

        // Verify payouts
        uint256 totalPayouts = 0;
        for (uint i = 0; i < payouts.length; i++) {
            totalPayouts += payouts[i];
        }
        require(totalPayouts <= remainingPool, "Invalid payouts");

        // Queue withdrawals
        for (uint i = 0; i < winners.length; i++) {
            pendingWithdrawals[winners[i]] += payouts[i];
        }

        // Transfer house fee
        if (houseFee > 0) {
            payable(config.feeRecipient).transfer(houseFee);
        }

        game.status = GameStatus.SETTLED;
        emit GameSettled(gameId, winners, payouts, houseFee);
    }

    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawal");

        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, amount);
    }

    function cancelGame(uint64 gameId) external {
        require(gameId > 0 && gameId < nextGameId, "Game not found");
        Game storage game = games[gameId - 1];

        require(msg.sender == game.creator, "Not creator");
        require(
            game.status == GameStatus.LOBBY || game.status == GameStatus.IN_PROGRESS,
            "Cannot cancel"
        );

        // Refund all players
        for (uint i = 0; i < game.players.length; i++) {
            pendingWithdrawals[game.players[i]] += game.deposits[i];
        }

        game.status = GameStatus.CANCELLED;
        emit GameCancelled(gameId, game.players);
    }

    // View functions
    function getGame(uint64 gameId) external view returns (Game memory) {
        require(gameId > 0 && gameId < nextGameId, "Game not found");
        return games[gameId - 1];
    }

    function getPendingWithdrawal(address player) external view returns (uint256) {
        return pendingWithdrawals[player];
    }

    function getConfig() external view returns (Config memory) {
        return config;
    }

    // Admin functions
    function updateServerSigner(address newSigner) external {
        require(msg.sender == config.admin, "Not admin");
        config.serverSigner = newSigner;
    }

    function updateFeeRecipient(address newRecipient) external {
        require(msg.sender == config.admin, "Not admin");
        config.feeRecipient = newRecipient;
    }

    function updateHouseCut(uint16 newCutBps) external {
        require(msg.sender == config.admin, "Not admin");
        require(newCutBps <= 2000, "Max 20%");
        config.houseCutBps = newCutBps;
    }

    // Events
    event GameCreated(uint64 indexed gameId, address indexed creator, uint256 stake, uint8 minPlayers);
    event PlayerJoined(uint64 indexed gameId, address indexed player);
    event GameStarted(uint64 indexed gameId, uint256 playerCount);
    event GameSettled(uint64 indexed gameId, address[] winners, uint256[] payouts, uint256 houseFee);
    event Withdrawn(address indexed player, uint256 amount);
    event GameCancelled(uint64 indexed gameId, address[] refundedPlayers);
}
```

---

## Appendix B: Reference Links

**Flow EVM Documentation:**
- Flow EVM Overview: https://developers.flow.com/evm/about
- Network Details: https://developers.flow.com/evm/networks
- Faucet: https://testnet-faucet.onflow.org/

**Development Tools:**
- Hardhat: https://hardhat.org/
- Ethers.js v6: https://docs.ethers.org/v6/
- Wagmi: https://wagmi.sh/
- RainbowKit: https://www.rainbowkit.com/

**Security:**
- OpenZeppelin Contracts: https://docs.openzeppelin.com/contracts/
- EIP-712: https://eips.ethereum.org/EIPS/eip-712
- ECDSA Recovery: https://docs.openzeppelin.com/contracts/api/utils#ECDSA

---

**End of Migration Plan**
