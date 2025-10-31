# Pepasur Contract - Quick Start Guide

Get the Pepasur smart contract deployed to Flow EVM Testnet in 5 minutes!

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- A wallet with Flow EVM Testnet FLOW tokens

## Step 1: Get Testnet FLOW

1. Visit: https://testnet-faucet.onflow.org/
2. Enter your wallet address
3. Request testnet FLOW tokens
4. Wait for confirmation (~30 seconds)

## Step 2: Install Dependencies

```bash
cd contract-flow
npm install
```

This installs:
- Hardhat (development environment)
- OpenZeppelin contracts (security)
- Ethers.js (blockchain interaction)
- Testing utilities

## Step 3: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env with your values
nano .env  # or use your preferred editor
```

**Required values:**

```env
# Your deployer wallet private key (starts with 0x)
DEPLOYER_PRIVATE_KEY=0x1234567890abcdef...

# Backend server wallet address (for signing settlements)
SERVER_SIGNER_ADDRESS=0xabcdef1234567890...

# Address to receive house fees (can be same as deployer)
FEE_RECIPIENT_ADDRESS=0x...
```

**How to get these:**

1. **DEPLOYER_PRIVATE_KEY**: Export from MetaMask
   - MetaMask → Account Details → Export Private Key
   - ⚠️ NEVER share this or commit to git!

2. **SERVER_SIGNER_ADDRESS**: Create a new wallet for backend
   ```bash
   # Generate using ethers.js
   node -e "console.log(require('ethers').Wallet.createRandom().address)"
   # Save the private key for backend use!
   ```

3. **FEE_RECIPIENT_ADDRESS**: Use your own address to receive fees

## Step 4: Compile Contract

```bash
npm run compile
```

Expected output:
```
Compiled 1 Solidity file successfully
```

## Step 5: Run Tests

```bash
npm test
```

This runs 30+ tests covering all functionality. Should see:
```
  Pepasur Contract
    ✓ Should deploy with correct initial state
    ✓ Should create a game successfully
    ✓ Should allow players to join
    ... (30 more tests)

  30 passing (5s)
```

## Step 6: Deploy to Flow EVM Testnet

```bash
npm run deploy:testnet
```

Expected output:
```
🚀 Starting Pepasur contract deployment...
✅ Contract deployed successfully!

📊 Deployment Summary:
├─ Contract Address: 0x1234567890abcdef1234567890abcdef12345678
├─ Transaction Hash: 0xabcdef...
└─ Total Cost: 0.001234 FLOW
```

**Save the contract address!** You'll need it for backend and frontend.

## Step 7: Initialize Contract

```bash
npm run initialize
```

This sets up:
- Server signer for signature verification
- Fee recipient for house cut
- Marks contract as ready to use

Expected output:
```
✅ Contract initialized successfully!
📊 Updated Configuration:
├─ Server Signer: 0x...
└─ Fee Recipient: 0x...
```

## Step 8: Verify Contract (Optional but Recommended)

```bash
npm run verify
```

This makes your contract viewable on FlowScan block explorer.

## Step 9: Update Backend

Add to `backend/.env`:

```env
# Flow EVM Configuration
FLOW_EVM_RPC_URL=https://testnet.evm.nodes.onflow.org
CHAIN_ID=545
PEPASUR_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678

# Server wallet (matching SERVER_SIGNER_ADDRESS from contract)
SERVER_PRIVATE_KEY=0x...
```

## Step 10: Update Frontend

Add to `frontend/.env`:

```env
NEXT_PUBLIC_FLOW_EVM_RPC=https://testnet.evm.nodes.onflow.org
NEXT_PUBLIC_CHAIN_ID=545
NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
NEXT_PUBLIC_BLOCK_EXPLORER=https://evm-testnet.flowscan.io
```

## Verification Checklist

- [ ] Contract deployed successfully
- [ ] Contract initialized with server signer
- [ ] Contract verified on FlowScan
- [ ] Backend `.env` updated with contract address
- [ ] Frontend `.env` updated with contract address
- [ ] Server signer private key matches address in contract
- [ ] Deployer wallet has remaining FLOW for future ops

## View Your Contract

**Block Explorer:**
```
https://evm-testnet.flowscan.io/address/0xYOUR_CONTRACT_ADDRESS
```

**Test Contract Functions:**

```bash
# In Hardhat console
npx hardhat console --network flowTestnet

# Then run:
const Pepasur = await ethers.getContractFactory("Pepasur");
const pepasur = Pepasur.attach("0xYOUR_CONTRACT_ADDRESS");

// Get config
await pepasur.getConfig();

// Get next game ID
await pepasur.getNextGameId();

// Check if initialized
const config = await pepasur.getConfig();
console.log("Initialized:", config.initialized);
```

## Common Issues

### "Insufficient funds for gas"
- Get more testnet FLOW: https://testnet-faucet.onflow.org/
- Check balance: `await ethers.provider.getBalance("YOUR_ADDRESS")`

### "Server signer not set"
- Run: `npm run initialize`
- Ensure `SERVER_SIGNER_ADDRESS` is set in `.env`

### "Cannot find module '@openzeppelin/contracts'"
- Run: `npm install`
- Delete `node_modules` and reinstall if needed

### "Invalid signature" in settlements
- Ensure backend `SERVER_PRIVATE_KEY` matches `SERVER_SIGNER_ADDRESS`
- Check EIP-712 domain matches contract address and chain ID 545

## Next Steps

1. **Phase 2**: Migrate backend to use `EvmService.js`
   - Replace Aptos SDK with ethers.js
   - Update signature signing logic
   - Test settlement flow

2. **Phase 3**: Migrate frontend to use wagmi
   - Replace Aptos wallet adapter
   - Add Flow EVM Testnet to wallet config
   - Update contract interaction hooks

3. **Phase 4**: End-to-end testing
   - Create game from frontend
   - Join with multiple wallets
   - Play through full game flow
   - Settle game from backend
   - Withdraw rewards

## Development Commands

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Run tests with gas reporting
REPORT_GAS=true npm test

# Run coverage
npm run test:coverage

# Deploy to testnet
npm run deploy:testnet

# Initialize contract
npm run initialize

# Verify on explorer
npm run verify

# Start local node (for testing)
npm run node

# Deploy to local node
npm run deploy:local

# Clean artifacts
npm run clean
```

## Security Reminders

⚠️ **NEVER commit private keys to git!**
- `.env` is in `.gitignore`
- Double-check before committing
- Use separate wallets for testnet and mainnet

⚠️ **Server signer security:**
- Keep server private key secure
- Only backend should have access
- Rotate keys periodically
- Use environment variables, never hardcode

⚠️ **Admin account:**
- Deployer is initial admin
- Can update server signer, fee recipient, house cut
- Transfer admin to multisig for production

## Support

- Contract README: `contract-flow/README.md`
- Migration Plan: `MIGRATION_PLAN.md`
- Flow EVM Docs: https://developers.flow.com/evm/
- Hardhat Docs: https://hardhat.org/docs

## Success! 🎉

Your Pepasur contract is now live on Flow EVM Testnet!

Contract Address: `0x...`
Explorer: `https://evm-testnet.flowscan.io/address/0x...`

Ready to migrate the backend and frontend!
