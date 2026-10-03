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
            : "border-[#AB9FF2]/70 bg-[#AB9FF2] text-[#17131f] shadow-[0_8px_24px_rgba(171,159,242,0.16)] hover:border-[#b8adf5] hover:bg-[#b8adf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AB9FF2]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07110d] active:bg-[#9d90e8]"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${wallet ? "bg-emerald-300" : available ? "bg-[#2b2140]" : "bg-[#2b2140]/55"}`} />
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
