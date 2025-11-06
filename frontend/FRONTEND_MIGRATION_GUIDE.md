# Frontend Migration Guide: Aptos → Flow EVM

Complete guide for migrating Pepasur frontend from Aptos wallet adapter to wagmi + RainbowKit for Flow EVM Testnet.

---

## Overview

**What Changed:**
- ❌ Removed: `@aptos-labs/wallet-adapter-react` (Aptos wallet)
- ❌ Removed: `@aptos-labs/ts-sdk` (Aptos SDK)
- ✅ Added: `wagmi` + `@rainbow-me/rainbowkit` (EVM wallets)
- ✅ Added: `viem` (EVM interactions)
- ✅ Simplified: Contract calls through wagmi hooks

**Good news:** `wagmi` (v2.18.2) and `viem` (v2.38.4) are already installed! ✅

---

## Setup

### 1. Install Additional Dependencies

Only RainbowKit needs to be installed:

```bash
cd frontend
npm install @rainbow-me/rainbowkit@^2.0.0
```

**All other dependencies already installed!**
- ✅ `wagmi@^2.18.2` - Already in package.json
- ✅ `viem@^2.38.4` - Already in package.json
- ✅ `@tanstack/react-query@^5.90.2` - Already in package.json

### 2. Configure Environment

Copy `.env.flow` to `.env.local`:

```bash
cp .env.flow .env.local
```

**Environment variables:**
```env
# Flow EVM Testnet Configuration
NEXT_PUBLIC_FLOW_EVM_RPC=https://testnet.evm.nodes.onflow.org
NEXT_PUBLIC_CHAIN_ID=545
NEXT_PUBLIC_NETWORK_NAME=Flow EVM Testnet

# Contract Configuration
NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c
NEXT_PUBLIC_IS_SIMPLE=true

# Block Explorer
NEXT_PUBLIC_BLOCK_EXPLORER=https://evm-testnet.flowscan.io

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Socket.io
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## Architecture Changes

### Aptos (Old)
```
AptosWalletAdapterProvider
  ↓
useWallet() hook
  ↓
Aptos SDK (createGame, joinGame, withdraw)
  ↓
Aptos Testnet
```

### Flow EVM (New)
```
WagmiProvider + RainbowKitProvider
  ↓
useAccount(), useWriteContract(), useReadContract() hooks
  ↓
viem/ethers.js (contract interactions)
  ↓
Flow EVM Testnet
```

---

## Step-by-Step Migration

### Step 1: Create wagmi Configuration

**File:** `lib/wagmi-config.ts` (new file)

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// Define Flow EVM Testnet chain
export const flowTestnet = defineChain({
  id: 545,
  name: 'Flow EVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'FLOW',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
    public: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'FlowScan',
      url: 'https://evm-testnet.flowscan.io',
    },
  },
  testnet: true,
});

// Create wagmi config
export const wagmiConfig = getDefaultConfig({
  appName: 'Pepasur',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [flowTestnet],
  ssr: true, // Enable SSR for Next.js
});
```

---

### Step 2: Update Providers

**File:** `components/providers.tsx`

**Before (Aptos):**
```typescript
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{ network: Network.TESTNET }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AptosWalletAdapterProvider>
  );
}
```

**After (Flow EVM):**
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { ReactNode, useState } from 'react';
import { wagmiConfig } from '@/lib/wagmi-config';
import '@rainbow-me/rainbowkit/styles.css';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 5 * 60 * 1000,
      },
    },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#00ff00', // Pixel green
            accentColorForeground: 'black',
            borderRadius: 'none', // Pixel style
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

---

### Step 3: Update layout.tsx

**File:** `app/layout.tsx`

**Change:**
```typescript
// Before
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css"

// After
import "@rainbow-me/rainbowkit/styles.css"
```

---

### Step 4: Update WalletConnect Component

**File:** `components/wallet-connect.tsx`

**Before (Aptos):**
```typescript
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design';

export default function WalletConnect({ onAddressChange }: WalletConnectProps) {
  const { account, connected, disconnect } = useWallet();

  const currentAddress = connected && account ? account.address.toString() : null;

  return (
    <div>
      {!connected ? (
        <WalletSelector />
      ) : (
        <Button onClick={() => disconnect()}>DISCONNECT WALLET</Button>
      )}
    </div>
  );
}
```

**After (Flow EVM):**
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import GifLoader from "@/components/gif-loader"

interface WalletConnectProps {
  onAddressChange: (address: string | null) => void;
  onJoinGame?: () => void;
  onCreateLobby?: () => void;
}

export default function WalletConnect({
  onAddressChange,
  onJoinGame,
  onCreateLobby
}: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const previousAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const currentAddress = isConnected && address ? address : null;

    if (currentAddress !== previousAddressRef.current) {
      console.log('Wallet address changed:', currentAddress);
      previousAddressRef.current = currentAddress;
      onAddressChange(currentAddress);
    }
  }, [isConnected, address, onAddressChange]);

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 gaming-bg scanlines">
      <div className="relative z-10 w-full max-w-sm sm:max-w-md">
        <Card className="w-full p-4 sm:p-6 bg-[#111111]/90 backdrop-blur-sm border border-[#2a2a2a]">
          <div className="text-center space-y-4 sm:space-y-6">
            {/* PEPASUR title */}
            <div className="text-4xl sm:text-5xl font-bold font-press-start tracking-wider">
              <span className="pixel-text-3d-green">PEPASUR</span>
            </div>

            {!isConnected ? (
              <div className="space-y-3 sm:space-y-4">
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    mounted,
                  }) => {
                    const ready = mounted;
                    const connected = ready && account && chain;

                    return (
                      <div
                        {...(!ready && {
                          'aria-hidden': true,
                          style: {
                            opacity: 0,
                            pointerEvents: 'none',
                            userSelect: 'none',
                          },
                        })}
                      >
                        {(() => {
                          if (!connected) {
                            return (
                              <Button
                                onClick={openConnectModal}
                                variant="pixel"
                                size="pixelLarge"
                                className="w-full"
                              >
                                CONNECT WALLET
                              </Button>
                            );
                          }
                        })()}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-center">
                  <GifLoader size="xl" />
                </div>
                <div className="text-base sm:text-lg font-press-start pixel-text-3d-green">
                  WALLET CONNECTED
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {onJoinGame && (
                    <Button
                      onClick={onJoinGame}
                      variant="pixel"
                      size="pixelLarge"
                      className="w-full"
                    >
                      JOIN GAME
                    </Button>
                  )}

                  {onCreateLobby && (
                    <Button
                      onClick={onCreateLobby}
                      variant="pixelRed"
                      size="pixelLarge"
                      className="w-full"
                    >
                      CREATE LOBBY
                    </Button>
                  )}

                  <Button
                    variant="pixelOutline"
                    size="pixelLarge"
                    className="w-full"
                    onClick={() => disconnect()}
                  >
                    DISCONNECT WALLET
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
```

---

### Step 5: Update Contract Interaction Hook

**File:** `hooks/useGameContract.ts` (new file)

```typescript
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { flowTestnet } from '@/lib/wagmi-config';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS as `0x${string}`;

// PepasurSimple ABI (simplified)
const PEPASUR_ABI = [
  {
    inputs: [
      { name: 'stakeAmount', type: 'uint256' },
      { name: 'minPlayers', type: 'uint8' }
    ],
    name: 'createGame',
    outputs: [{ name: 'gameId', type: 'uint64' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'joinGame',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'getGame',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint64' },
          { name: 'creator', type: 'address' },
          { name: 'stakeAmount', type: 'uint256' },
          { name: 'minPlayers', type: 'uint8' },
          { name: 'players', type: 'address[]' },
          { name: 'status', type: 'uint8' },
          { name: 'totalPool', type: 'uint256' }
        ],
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'getPendingWithdrawal',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'getPlayers',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export function useGameContract() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Create game
  const createGame = async (stakeAmountInFlow: string, minPlayers: number) => {
    const stakeAmount = parseEther(stakeAmountInFlow);

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: PEPASUR_ABI,
      functionName: 'createGame',
      args: [stakeAmount, minPlayers],
      value: stakeAmount,
      chain: flowTestnet,
    });

    return hash;
  };

  // Join game
  const joinGame = async (gameId: number, stakeAmountInFlow: string) => {
    const stakeAmount = parseEther(stakeAmountInFlow);

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: PEPASUR_ABI,
      functionName: 'joinGame',
      args: [BigInt(gameId)],
      value: stakeAmount,
      chain: flowTestnet,
    });

    return hash;
  };

  // Withdraw rewards
  const withdraw = async () => {
    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: PEPASUR_ABI,
      functionName: 'withdraw',
      chain: flowTestnet,
    });

    return hash;
  };

  return {
    createGame,
    joinGame,
    withdraw,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to read game info
export function useGameInfo(gameId: number | null) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PEPASUR_ABI,
    functionName: 'getGame',
    args: gameId ? [BigInt(gameId)] : undefined,
    query: {
      enabled: gameId !== null,
    },
  });
}

// Hook to read pending withdrawal
export function usePendingWithdrawal(playerAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PEPASUR_ABI,
    functionName: 'getPendingWithdrawal',
    args: playerAddress ? [playerAddress] : undefined,
    query: {
      enabled: !!playerAddress,
    },
  });
}

// Utility to format FLOW
export const formatFlow = (wei: bigint | string) => {
  return formatEther(BigInt(wei));
};

// Utility to parse FLOW
export const parseFlow = (flow: string) => {
  return parseEther(flow);
};
```

---

## Step 6: Update Staking Screen

**File:** `components/staking-screen.tsx`

**Key changes:**
```typescript
// Before (Aptos)
import { useWallet, type InputTransactionData } from "@aptos-labs/wallet-adapter-react"
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk"

const { account, signAndSubmitTransaction } = useWallet();

// Create game transaction
const transaction: InputTransactionData = {
  data: {
    function: `${contractAddress}::pepasur::create_game`,
    functionArguments: [stakeAmount, minPlayers],
  },
};
const response = await signAndSubmitTransaction(transaction);

// After (Flow EVM)
import { useAccount } from 'wagmi';
import { useGameContract } from '@/hooks/useGameContract';

const { address } = useAccount();
const { createGame, isPending } = useGameContract();

// Create game transaction
const hash = await createGame(stakeAmountInFlow, minPlayers);
```

---

## Step 7: Update Withdraw Rewards Component

**File:** `components/withdraw-rewards.tsx`

**Key changes:**
```typescript
// Before (Aptos)
const transaction: InputTransactionData = {
  data: {
    function: `${contractAddress}::pepasur::withdraw`,
    functionArguments: [],
  },
};
await signAndSubmitTransaction(transaction);

// After (Flow EVM)
const { withdraw, isPending, isSuccess } = useGameContract();
await withdraw();
```

---

## Complete Contract ABI

For reference, here's the complete PepasurSimple ABI to use in your hooks:

```typescript
export const PEPASUR_SIMPLE_ABI = [
  // Write functions
  {
    inputs: [
      { name: 'stakeAmount', type: 'uint256' },
      { name: 'minPlayers', type: 'uint8' }
    ],
    name: 'createGame',
    outputs: [{ name: 'gameId', type: 'uint64' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'joinGame',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Read functions
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'getGame',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint64' },
          { name: 'creator', type: 'address' },
          { name: 'stakeAmount', type: 'uint256' },
          { name: 'minPlayers', type: 'uint8' },
          { name: 'players', type: 'address[]' },
          { name: 'status', type: 'uint8' },
          { name: 'totalPool', type: 'uint256' }
        ],
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'getPendingWithdrawal',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'getPlayers',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'nextGameId',
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'houseCutBps',
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint64' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'stakeAmount', type: 'uint256' }
    ],
    name: 'GameCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint64' },
      { indexed: true, name: 'player', type: 'address' }
    ],
    name: 'PlayerJoined',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint64' },
      { indexed: false, name: 'playerCount', type: 'uint256' }
    ],
    name: 'GameStarted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint64' },
      { indexed: false, name: 'winners', type: 'address[]' },
      { indexed: false, name: 'reward', type: 'uint256' }
    ],
    name: 'GameSettled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ],
    name: 'Withdrawn',
    type: 'event'
  }
] as const;
```

---

## Summary of Changes

### Files to Create (3 files)
1. `lib/wagmi-config.ts` - wagmi configuration
2. `hooks/useGameContract.ts` - Contract interaction hook
3. `.env.local` - Copy from .env.flow

### Files to Modify (4 files)
1. `package.json` - Add RainbowKit
2. `components/providers.tsx` - Replace Aptos with wagmi + RainbowKit
3. `app/layout.tsx` - Update CSS import
4. `components/wallet-connect.tsx` - Replace wallet UI
5. `components/staking-screen.tsx` - Update contract calls
6. `components/withdraw-rewards.tsx` - Update withdraw logic

### Key Differences

| Aspect | Aptos | Flow EVM |
|--------|-------|----------|
| **Wallet Provider** | `AptosWalletAdapterProvider` | `WagmiProvider` + `RainbowKitProvider` |
| **Wallet Hook** | `useWallet()` | `useAccount()`, `useDisconnect()` |
| **Contract Write** | `signAndSubmitTransaction()` | `useWriteContract()` |
| **Contract Read** | Aptos SDK `getGame()` | `useReadContract()` |
| **Address Format** | AccountAddress object | `0x${string}` |
| **Amount Format** | Octas (10^-8 APT) | Wei (10^-18 FLOW) |
| **Transaction** | `InputTransactionData` | `writeContractAsync()` |

---

## Testing

### 1. Start Development Server
```bash
cd frontend
npm install @rainbow-me/rainbowkit@^2.0.0
npm run dev
```

### 2. Connect Wallet
- Open `http://localhost:3000`
- Click "Connect Wallet"
- Select MetaMask or other EVM wallet
- Switch to Flow EVM Testnet (or add it)

### 3. Test Game Flow
1. **Create Game:** Stake 0.1 FLOW, set 4 min players
2. **Join Game:** Join with 3 other wallets
3. **Play Game:** Complete game logic
4. **Withdraw:** Winners withdraw rewards

---

## Troubleshooting

### "Chain not found in wallet"
**Fix:** Add Flow EVM Testnet to MetaMask manually:
- Network Name: Flow EVM Testnet
- RPC URL: https://testnet.evm.nodes.onflow.org
- Chain ID: 545
- Currency Symbol: FLOW
- Block Explorer: https://evm-testnet.flowscan.io

### "User rejected transaction"
**Fix:** User canceled in wallet - normal behavior

### "Insufficient funds for gas"
**Fix:** Get testnet FLOW from https://testnet-faucet.onflow.org/

---

## Next Steps

1. Install RainbowKit
2. Create wagmi config
3. Update providers
4. Update wallet connect
5. Update contract interactions
6. Test complete flow

---

## Support

**Documentation:**
- Contract: `../../contract-flow/SIMPLE_CONTRACT_GUIDE.md`
- Backend: `../backend/BACKEND_MIGRATION_GUIDE.md`
- Deployment: `../../DEPLOYMENT_SUCCESS.md`

**Contract:**
- Address: `0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c`
- Explorer: https://evm-testnet.flowscan.io/address/0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c

**Wagmi Docs:** https://wagmi.sh
**RainbowKit Docs:** https://www.rainbowkit.com
