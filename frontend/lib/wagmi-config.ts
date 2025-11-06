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
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '1a0d1c90e18d1d6c35cc9fb4f4de7a67',
  chains: [flowTestnet],
  ssr: true, // Enable SSR for Next.js
});
