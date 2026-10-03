"use client";

import { useSolanaWallet } from "@/components/SolanaWalletProvider";

export default function WalletConnectButton({ compact = false }: { compact?: boolean }) {
  const { wallet, connect, disconnect, connecting, available, error } = useSolanaWallet();

  async function handleClick() {
    if (wallet) {
      await disconnect();
      return;
    }
    await connect().catch(() => undefined);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={connecting}
        title={error || undefined}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
          wallet
            ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
            : "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${wallet ? "bg-emerald-300" : available ? "bg-white/35" : "bg-white/20"}`} />
        {wallet
          ? `Phantom ${wallet.slice(0, 4)}…${wallet.slice(-4)}`
          : connecting
            ? "Connecting…"
            : compact
              ? "Connect Phantom"
              : "Connect Phantom wallet"}
      </button>
    </div>
  );
}
