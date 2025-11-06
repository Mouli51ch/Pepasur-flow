# Phase 3: Frontend Migration - IN PROGRESS

**Date:** October 31, 2025
**Status:** INFRASTRUCTURE COMPLETE - Ready for Implementation
**Result:** Core files created, ready to update components

---

## What's Been Accomplished ✅

### 1. Dependencies Installed
- ✅ **@rainbow-me/rainbowkit@^2.0.0** - Installed successfully
- ✅ **wagmi@^2.18.2** - Already installed
- ✅ **viem@^2.38.4** - Already installed
- ✅ **@tanstack/react-query@^5.90.2** - Already installed

### 2. Configuration Files Created
- ✅ **lib/wagmi-config.ts** - wagmi configuration with Flow EVM Testnet
- ✅ **.env.local** - Environment variables configured
- ✅ **hooks/useGameContract.ts** - Contract interaction hooks
- ✅ **components/providers.flow-evm.tsx** - New providers with wagmi + RainbowKit

### 3. Documentation Created
- ✅ **FRONTEND_MIGRATION_GUIDE.md** - Complete migration guide with examples
- ✅ **PHASE3_PROGRESS.md** - This file (progress tracking)

---

## Files Created (4 new files)

### Configuration & Hooks
1. **lib/wagmi-config.ts** (35 lines)
   - Flow EVM Testnet chain definition
   - wagmi configuration
   - RainbowKit integration

2. **hooks/useGameContract.ts** (195 lines)
   - Complete PepasurSimple ABI
   - `useGameContract()` hook (createGame, joinGame, withdraw)
   - `useGameInfo()` hook (read game data)
   - `usePendingWithdrawal()` hook (check rewards)
   - `useGamePlayers()` hook (get players)
   - Utility functions (formatFlow, parseFlow)

### UI Components
3. **components/providers.flow-evm.tsx** (35 lines)
   - WagmiProvider configuration
   - RainbowKitProvider with pixel theme
   - QueryClientProvider

### Configuration
4. **.env.local** (18 lines)
   - Flow EVM RPC URL
   - Contract address
   - Chain ID (545)
   - Backend API URLs

---

## What Needs to Be Done ⏳

### High Priority (Core Functionality)

#### 1. Replace providers.tsx
**Current status:** Backup created (providers.flow-evm.tsx)
**Action needed:**
```bash
cd frontend
cp components/providers.tsx components/providers.aptos.backup.tsx
cp components/providers.flow-evm.tsx components/providers.tsx
```

#### 2. Update app/layout.tsx
**Current:** `import "@aptos-labs/wallet-adapter-ant-design/dist/index.css"`
**Change to:** `import "@rainbow-me/rainbowkit/styles.css"`

**File:** `app/layout.tsx` (line 8)

#### 3. Update components/wallet-connect.tsx
**Current approach:** Uses `useWallet()` from Aptos
**New approach:** Uses `useAccount()` and `useDisconnect()` from wagmi

**Key changes:**
```typescript
// Before
import { useWallet } from '@aptos-labs/wallet-adapter-react';
const { account, connected, disconnect } = useWallet();

// After
import { useAccount, useDisconnect } from 'wagmi';
const { address, isConnected } = useAccount();
const { disconnect } = useDisconnect();
```

#### 4. Update components/staking-screen.tsx
**Current approach:** Uses Aptos SDK for createGame/joinGame
**New approach:** Uses `useGameContract()` hook

**Key changes:**
```typescript
// Before
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk"
const response = await signAndSubmitTransaction(transaction);

// After
import { useGameContract } from '@/hooks/useGameContract';
const { createGame, joinGame, isPending } = useGameContract();
const hash = await createGame(stakeAmount, minPlayers);
```

#### 5. Update components/withdraw-rewards.tsx
**Current approach:** Uses Aptos SDK for withdraw
**New approach:** Uses `useGameContract()` hook

**Key changes:**
```typescript
// Before
const transaction = { data: { function: `${address}::pepasur::withdraw` } };
await signAndSubmitTransaction(transaction);

// After
const { withdraw, isPending, isSuccess } = useGameContract();
await withdraw();
```

---

## Migration Checklist

### Core Infrastructure ✅
- [x] Install RainbowKit
- [x] Create wagmi configuration
- [x] Create contract interaction hooks
- [x] Create new providers component
- [x] Create .env.local file
- [x] Create documentation

### Component Updates ⏳
- [ ] Replace providers.tsx
- [ ] Update layout.tsx (CSS import)
- [ ] Update wallet-connect.tsx
- [ ] Update staking-screen.tsx
- [ ] Update withdraw-rewards.tsx
- [ ] Update any other components using Aptos SDK

### Testing ⏳
- [ ] Test wallet connection (MetaMask)
- [ ] Test game creation
- [ ] Test game joining
- [ ] Test game play
- [ ] Test withdrawal

---

## Quick Start: Complete the Migration

### Step 1: Backup Original Files (2 minutes)
```bash
cd D:\pepasur-flow\PepasurAptos\frontend

# Backup Aptos files
cp components/providers.tsx components/providers.aptos.backup.tsx
cp components/wallet-connect.tsx components/wallet-connect.aptos.backup.tsx
cp components/staking-screen.tsx components/staking-screen.aptos.backup.tsx
cp components/withdraw-rewards.tsx components/withdraw-rewards.aptos.backup.tsx
cp app/layout.tsx app/layout.aptos.backup.tsx
```

### Step 2: Replace providers.tsx (30 seconds)
```bash
cp components/providers.flow-evm.tsx components/providers.tsx
```

### Step 3: Update layout.tsx (1 minute)
**File:** `app/layout.tsx`

Change line 8:
```typescript
// Before
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css"

// After
import "@rainbow-me/rainbowkit/styles.css"
```

### Step 4: Create Updated Components (Follow Guide)

Refer to `FRONTEND_MIGRATION_GUIDE.md` for detailed examples of:
- wallet-connect.tsx updates
- staking-screen.tsx updates
- withdraw-rewards.tsx updates

---

## Key Differences: Aptos vs Flow EVM

### Wallet Connection
| Aspect | Aptos | Flow EVM |
|--------|-------|----------|
| **Provider** | `AptosWalletAdapterProvider` | `WagmiProvider` + `RainbowKitProvider` |
| **Hook** | `useWallet()` | `useAccount()` + `useDisconnect()` |
| **Address** | `account.address` (AccountAddress object) | `address` (`0x${string}`) |
| **Connected** | `connected` (boolean) | `isConnected` (boolean) |
| **Disconnect** | `disconnect()` | `disconnect()` from `useDisconnect()` |

### Contract Interactions
| Aspect | Aptos | Flow EVM |
|--------|-------|----------|
| **Write** | `signAndSubmitTransaction()` | `useWriteContract()` |
| **Read** | Aptos SDK `aptos.view()` | `useReadContract()` |
| **Transaction** | `InputTransactionData` object | Direct function call |
| **Wait** | `await aptos.waitForTransaction()` | `useWaitForTransactionReceipt()` |

### Amount Formatting
| Aspect | Aptos | Flow EVM |
|--------|-------|----------|
| **Unit** | Octas (10^-8 APT) | Wei (10^-18 FLOW) |
| **Format** | `/ 100000000` | `formatEther()` from viem |
| **Parse** | `* 100000000` | `parseEther()` from viem |
| **Display** | "0.001 APT" | "0.001 FLOW" |

---

## Testing Strategy

### 1. Local Testing (Recommended)
```bash
# Start backend (in backend directory)
cd ../backend
npm run dev

# Start frontend (in frontend directory)
cd ../frontend
npm run dev
```

**Access:** http://localhost:3000

**Test flow:**
1. Connect MetaMask wallet
2. Add/Switch to Flow EVM Testnet
3. Create game (0.1 FLOW stake)
4. Join with 3 other wallets
5. Complete game
6. Withdraw rewards

### 2. Network Configuration

**Add Flow EVM Testnet to MetaMask:**
- **Network Name:** Flow EVM Testnet
- **RPC URL:** https://testnet.evm.nodes.onflow.org
- **Chain ID:** 545
- **Currency Symbol:** FLOW
- **Block Explorer:** https://evm-testnet.flowscan.io

**Get testnet FLOW:**
https://testnet-faucet.onflow.org/

---

## Architecture Overview

### Before (Aptos)
```
App
 └─ AptosWalletAdapterProvider
     └─ QueryClientProvider
         └─ SocketProvider
             └─ Page Components
                 └─ useWallet() hook
                     └─ Aptos SDK (createGame, joinGame, withdraw)
```

### After (Flow EVM)
```
App
 └─ WagmiProvider
     └─ QueryClientProvider
         └─ RainbowKitProvider
             └─ SocketProvider
                 └─ Page Components
                     └─ useAccount() hook
                         └─ useGameContract() hook
                             └─ wagmi/viem (createGame, joinGame, withdraw)
```

---

## File Structure

```
frontend/
├── .env.local                          # ✅ Created
├── lib/
│   └── wagmi-config.ts                 # ✅ Created
├── hooks/
│   └── useGameContract.ts              # ✅ Created
├── components/
│   ├── providers.tsx                   # ⏳ To be replaced
│   ├── providers.flow-evm.tsx          # ✅ Created (backup)
│   ├── wallet-connect.tsx              # ⏳ To be updated
│   ├── staking-screen.tsx              # ⏳ To be updated
│   └── withdraw-rewards.tsx            # ⏳ To be updated
├── app/
│   └── layout.tsx                      # ⏳ To be updated (line 8)
└── FRONTEND_MIGRATION_GUIDE.md         # ✅ Created
```

---

## Next Steps (Priority Order)

### Immediate (5 minutes)
1. ✅ Replace providers.tsx
2. ✅ Update layout.tsx (CSS import)

### Core Components (30 minutes)
3. ⏳ Update wallet-connect.tsx
4. ⏳ Update staking-screen.tsx
5. ⏳ Update withdraw-rewards.tsx

### Testing (30 minutes)
6. ⏳ Test wallet connection
7. ⏳ Test game creation and joining
8. ⏳ Test complete game flow
9. ⏳ Test withdrawal

**Total estimated time:** ~1 hour for complete migration

---

## Success Criteria

Phase 3 is complete when:
1. ✅ RainbowKit installed
2. ✅ wagmi configured
3. ✅ Contract hooks created
4. ⏳ Providers updated
5. ⏳ Wallet connection works with MetaMask
6. ⏳ Can create games on Flow EVM
7. ⏳ Can join games on Flow EVM
8. ⏳ Can withdraw rewards on Flow EVM
9. ⏳ No Aptos dependencies in active code

---

## Support & Documentation

### Documentation
1. **FRONTEND_MIGRATION_GUIDE.md** - Complete guide with code examples
2. **PHASE3_PROGRESS.md** - This file (progress tracking)
3. **../backend/BACKEND_MIGRATION_GUIDE.md** - Backend reference
4. **../../contract-flow/SIMPLE_CONTRACT_GUIDE.md** - Contract reference

### External Resources
- **wagmi Docs:** https://wagmi.sh
- **RainbowKit Docs:** https://www.rainbowkit.com
- **viem Docs:** https://viem.sh
- **Flow EVM Docs:** https://developers.flow.com/evm/using

### Contract Info
- **Address:** `0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c`
- **Network:** Flow EVM Testnet (545)
- **Explorer:** https://evm-testnet.flowscan.io/address/0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c

---

## Summary

**Phase 3 Status:** Infrastructure Complete, Ready for Component Updates

**What's Done:**
- ✅ All dependencies installed
- ✅ Configuration files created
- ✅ Contract hooks ready
- ✅ New providers ready
- ✅ Documentation complete

**What's Next:**
- Update 5 component files
- Test with MetaMask
- Complete end-to-end testing

**Estimated Time Remaining:** ~1 hour

---

**Ready to complete Phase 3!** Follow the Quick Start guide above to finish the migration. 🚀
