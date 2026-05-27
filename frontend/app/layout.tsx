import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '../lib/providers';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'O{S}INT - Somnia Intelligent Apps',
  description: 'Lookup app using OSINT technology to discover personal data and leaked credentials across the web, currently built with Somnia agent infrastructure on testnet for secure receipt-based queries, retrieval link generation, and per-network local storage isolation.',
  icons: {
    icon: '/images/favicon.ico'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body>
        <Providers>
          <main className="min-h-screen bg-slate-950 text-slate-100">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
