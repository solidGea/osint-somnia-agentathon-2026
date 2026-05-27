'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';

export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({
    address
  });
  
  function formatBalance(value: bigint, decimals: number, precision = 2) {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  // Pad with zeros – slice to precision
  let fractionStr = fraction.toString().padStart(decimals, "0").slice(0, precision);
  // Remove trailing dot if precision is 0
  return precision > 0 ? `${whole.toString()}.${fractionStr}` : whole.toString();
}

  return (
    <div className="w-full max-w-[760px] rounded-3xl border border-cyan-500/20 bg-slate-950/90 p-4 shadow-xl shadow-cyan-500/10">
      <div className="grid gap-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
          {isConnected && (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="space-y-2">
                  <div>
                    
                    <p className="mt-1 text-sm font-medium text-slate-100">
                        Balance: {balanceData
                        ? `${formatBalance(balanceData.value, balanceData.decimals, 2)} ${balanceData.symbol}`
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="rounded-3xl bg-slate-950/95 p-3 text-center shadow-lg shadow-cyan-500/5 sm:min-w-[220px] flex justify-center">
                  <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
                </div>
              </div>
            </>
          )}
          {!isConnected && (
            <div className="rounded-3xl bg-slate-950/95 p-3 text-center shadow-lg shadow-cyan-500/5 sm:min-w-[220px] flex justify-center">
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
