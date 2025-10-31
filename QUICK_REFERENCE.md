# Pepasur Flow EVM - Quick Reference

---

## 🚀 Current Status: 80% Complete

**Working:** Contract ✅ | Backend ✅ | Wallet ✅
**Remaining:** 2 UI components (~1 hour)

---

## 🌐 Access Your App

**Main Page:** http://localhost:3000
**Test Page:** http://localhost:3000/wallet-test (fully functional!)
**Backend:** http://localhost:3001

---

## 🔑 Contract Info

**Address:** `0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c`
**Network:** Flow EVM Testnet (Chain ID: 545)
**Explorer:** https://evm-testnet.flowscan.io/address/0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c

---

## 🦊 MetaMask Setup

**Add Flow EVM Testnet:**
- Network: `Flow EVM Testnet`
- RPC: `https://testnet.evm.nodes.onflow.org`
- Chain ID: `545`
- Symbol: `FLOW`

**Get Testnet FLOW:**
https://testnet-faucet.onflow.org/

---

## ✅ What Works Now

1. **Wallet Connection** - RainbowKit on main page
2. **Test Page** - Full contract testing (`/wallet-test`)
3. **Backend** - Flow EVM integration complete
4. **Contract** - All functions deployed and working

---

## ⏳ What Needs Update (2 files)

1. `components/staking-screen.tsx` - Game creation/joining
2. `components/withdraw-rewards.tsx` - Reward withdrawal

**Guide:** `FRONTEND_MIGRATION_GUIDE.md`
**Example:** `app/wallet-test/page.tsx`
**Time:** ~1 hour

---

## 📚 Key Documentation

| File | Purpose |
|------|---------|
| `MIGRATION_COMPLETE_SUMMARY.md` | Full status overview |
| `FRONTEND_MIGRATION_GUIDE.md` | Step-by-step component updates |
| `PHASE3_PROGRESS.md` | Detailed progress tracking |
| `hooks/useGameContract.ts` | Contract interaction reference |

---

## 🧪 Testing

**Test Wallet Connection:**
1. Go to http://localhost:3000
2. Click "CONNECT WALLET"
3. Select MetaMask
4. Add Flow EVM Testnet
5. Connect!

**Test Contract Interactions:**
1. Go to http://localhost:3000/wallet-test
2. Connect wallet
3. Try "CREATE TEST GAME" (0.001 FLOW)
4. Test "JOIN GAME" with game ID
5. Test "WITHDRAW" (if you have rewards)

---

## 🔄 Restart Servers

**Backend:**
```bash
cd PepasurAptos/backend
npm run dev
```

**Frontend:**
```bash
cd PepasurAptos/frontend
npm run dev
```

---

## 🐛 Common Issues

**Socket.IO errors?**
→ Harmless, doesn't affect wallet

**Wrong network?**
→ Switch to Flow EVM Testnet in MetaMask

**No testnet FLOW?**
→ Get from faucet: https://testnet-faucet.onflow.org/

**Aptos errors on main page?**
→ Expected, use `/wallet-test` for now

---

## 📞 Quick Help

**wagmi Docs:** https://wagmi.sh
**RainbowKit Docs:** https://www.rainbowkit.com
**Flow EVM Docs:** https://developers.flow.com/evm

---

## 🎯 Next Steps

**Option 1:** Test infrastructure on `/wallet-test`
**Option 2:** Update remaining 2 components
**Option 3:** Deploy to production

**Recommendation:** Test first, then update components when ready!

---

**🎉 80% Complete - Great Progress!**
