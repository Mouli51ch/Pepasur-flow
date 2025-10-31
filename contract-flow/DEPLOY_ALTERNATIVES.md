# Alternative Deployment Methods

We're experiencing timeout issues with Node.js-based deployment scripts. This document provides alternative ways to deploy your Pepasur contract.

## Current Situation

✅ **Contract compiled successfully**
✅ **Tests passing (30/31)**
✅ **You have testnet FLOW tokens** (189,999 FLOW)
✅ **RPC endpoint is accessible**
❌ **Node.js deployment scripts timing out**

This appears to be a local network/firewall issue preventing Node.js HTTP clients from completing transactions.

---

## Option 1: Deploy via Remix IDE (Recommended - Easiest)

### Steps:

1. **Get the flattened contract:**
   ```bash
   cd contract-flow
   npx hardhat flatten contracts/Pepasur.sol > Pepasur-flattened.sol
   ```

2. **Open Remix:** https://remix.ethereum.org

3. **Create new file:**
   - Click "File" → "New File"
   - Name it: `Pepasur.sol`
   - Paste contents of `Pepasur-flattened.sol`

4. **Compile:**
   - Go to "Solidity Compiler" tab
   - Select compiler: `0.8.20`
   - Enable optimization: `200 runs`
   - Click "Compile Pepasur.sol"

5. **Deploy:**
   - Go to "Deploy & Run Transactions" tab
   - Environment: Select "Injected Provider - MetaMask"
   - MetaMask will pop up → Add Flow EVM Testnet:
     - **Network Name:** Flow EVM Testnet
     - **RPC URL:** https://testnet.evm.nodes.onflow.org
     - **Chain ID:** 545
     - **Currency Symbol:** FLOW
     - **Block Explorer:** https://evm-testnet.flowscan.io
   - Import your deployer account to MetaMask using the private key
   - Select contract: `Pepasur`
   - Click "Deploy"
   - Confirm in MetaMask

6. **Initialize:**
   - After deployment, expand deployed contract
   - Call `initialize` function with:
     - `_serverSigner`: `0xe797c0a36b075cFd0ce6e14619d72D875D69F430`
     - `_feeRecipient`: `0x798b32BDf86253060d598038b1D77C98C36881D6`
   - Confirm transaction

7. **Copy contract address** from Remix and update your `.env` files

---

## Option 2: Try Different Network/Machine

The timeout issue might be specific to your current network. Try:

1. **Use mobile hotspot** instead of current WiFi/Ethernet
2. **Try from different machine** (if available)
3. **Use VPN** to bypass potential firewall issues
4. **Disable antivirus/firewall temporarily**

Then retry:
```bash
cd contract-flow
npm run deploy:testnet
```

---

## Option 3: Deploy via Foundry (Alternative CLI)

If you have Foundry installed:

```bash
# Install Foundry (if not already)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Convert to Foundry project
forge init --force

# Deploy
forge create contracts/Pepasur.sol:Pepasur \
  --rpc-url https://testnet.evm.nodes.onflow.org \
  --private-key 0xaf0e3c0f38439b5347fdf62b609f1cbcfa2b892a9a4d34da14cf2e8729dda421 \
  --legacy
```

---

## Option 4: Manual Transaction Construction

If you're comfortable with low-level transactions:

1. Get contract bytecode from `artifacts/contracts/Pepasur.sol/Pepasur.json`
2. Use MetaMask or another wallet to send a contract creation transaction
3. Set gas limit to 5,000,000
4. Set gas price to 1 gwei

---

## After Successful Deployment

Once deployed by **any method**, update your environment files:

### Backend (backend/.env):
```env
FLOW_EVM_RPC_URL=https://testnet.evm.nodes.onflow.org
CHAIN_ID=545
PEPASUR_CONTRACT_ADDRESS=<YOUR_CONTRACT_ADDRESS>
SERVER_PRIVATE_KEY=0xb09b005ee8bc654c80ab760f163a785f0318bb164384f6cdfe10c5c321717b95
```

### Frontend (frontend/.env):
```env
NEXT_PUBLIC_FLOW_EVM_RPC=https://testnet.evm.nodes.onflow.org
NEXT_PUBLIC_CHAIN_ID=545
NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS=<YOUR_CONTRACT_ADDRESS>
NEXT_PUBLIC_BLOCK_EXPLORER=https://evm-testnet.flowscan.io
```

---

## Troubleshooting Node.js Deployment

If you want to fix the Node.js deployment issue:

### Check 1: Proxy Settings
```bash
# Check if proxy is set
echo %HTTP_PROXY%
echo %HTTPS_PROXY%

# If set, try unsetting
set HTTP_PROXY=
set HTTPS_PROXY=
```

### Check 2: Node Version
```bash
node --version  # Should be v18+
```

### Check 3: Firewall
- Windows Defender Firewall → Allow an app
- Add Node.js to allowed apps

### Check 4: Antivirus
- Temporarily disable antivirus
- Retry deployment

### Check 5: DNS
```bash
# Try using Cloudflare DNS
nslookup testnet.evm.nodes.onflow.org 1.1.1.1
```

---

## Recommended: Use Remix

**For quickest deployment, use Option 1 (Remix IDE).** It's browser-based, so it bypasses any Node.js networking issues you're experiencing.

**Time estimate:** 5-10 minutes to deploy via Remix

---

## Need Help?

If you get stuck:
1. The contract artifact is ready in `artifacts/contracts/Pepasur.sol/Pepasur.json`
2. All configuration files are prepared
3. Contract has been tested and is ready to deploy
4. Issue is purely with local network connectivity

Once deployed (by any method), you can proceed to **Phase 2: Backend Migration**.
