'use client';

import '@rainbow-me/rainbowkit/styles.css';
import type { Chain } from 'viem';
import { WagmiConfig, createConfig } from 'wagmi';
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { http } from 'viem';

const somniaMainnet: Chain = {
  id: 5031,
  name: 'Somnia Mainnet',
  nativeCurrency: {
    name: 'Somnia',
    symbol: 'SOMI',
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ['https://api.infra.mainnet.somnia.network/'],
      webSocket: ['wss://api.infra.mainnet.somnia.network/ws']
    },
    public: {
      http: ['https://api.infra.mainnet.somnia.network/']
    }
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://explorer.somnia.network'
    }
  },
  testnet: false
};

const somniaTestnet: Chain = {
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: {
    name: 'Somnia Testnet',
    symbol: 'STT',
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ['https://api.infra.testnet.somnia.network/'],
      webSocket: ['wss://api.infra.testnet.somnia.network/ws']
    },
    public: {
      http: ['https://api.infra.testnet.somnia.network/']
    }
  },
  blockExplorers: {
    default: {
      name: 'Somnia Testnet Explorer',
      url: 'https://shannon-explorer.somnia.network/'
    }
  },
  testnet: true
};

const chains: [Chain, ...Chain[]] = [somniaMainnet, somniaTestnet];

const { connectors } = getDefaultWallets({
  appName: 'somniaApps',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false
    }
  }
});

const wagmiConfig = createConfig({
  connectors,
  chains,
  transports: {
    [somniaMainnet.id]: http(),
    [somniaTestnet.id]: http()
  }
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider initialChain={somniaMainnet} locale="en-US">
          {children}
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              duration: 5000,
              className: 'bg-slate-950/95 text-slate-100 border border-slate-700 shadow-xl'
            }}
          />
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
