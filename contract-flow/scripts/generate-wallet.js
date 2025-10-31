const { ethers } = require("ethers");

/**
 * Generate a new wallet for server signer
 *
 * Usage: node scripts/generate-wallet.js
 */

console.log("🔑 Generating new wallet for server signer...\n");

const wallet = ethers.Wallet.createRandom();

console.log("📋 Server Signer Wallet Details:");
console.log("├─ Address:", wallet.address);
console.log("└─ Private Key:", wallet.privateKey);

console.log("\n⚠️  IMPORTANT: Save these credentials securely!");
console.log("1. Add SERVER_SIGNER_ADDRESS to contract-flow/.env:");
console.log("   SERVER_SIGNER_ADDRESS=" + wallet.address);
console.log("\n2. Add SERVER_PRIVATE_KEY to backend/.env:");
console.log("   SERVER_PRIVATE_KEY=" + wallet.privateKey);
console.log("\n3. NEVER commit these keys to git!");
console.log("\n4. For FEE_RECIPIENT_ADDRESS, you can use your deployer address");
console.log("   or this new address (if you want fees separate)\n");
