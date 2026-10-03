"use client";

import { useSolanaWallet } from "@/components/SolanaWalletProvider";

export default function WalletConnectButton({ compact = false }: { compact?: boolean }) {
  const {
    wallet,
    connect,
    disconnect,
    connecting,
    disconnecting,
    available,
    error,
  } = useSolanaWallet();

  function isMobileBrowser() {
    return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function openInPhantom() {
    const target = encodeURIComponent(window.location.href);
    const ref = encodeURIComponent(window.location.origin);
    window.location.href = `https://phantom.com/ul/browse/${target}?ref=${ref}`;
  }

  async function handleConnect() {
    if (!available && isMobileBrowser()) {
      openInPhantom();
      return;
    }
    await connect().catch(() => undefined);
  }

  if (wallet) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Phantom {wallet.slice(0, 4)}…{wallet.slice(-4)}
        </div>
        <button
          type="button"
          onClick={() => void disconnect()}
          disabled={disconnecting}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs font-medium text-white/45 transition hover:bg-white/[0.07] hover:text-white/75 disabled:opacity-50"
        >
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        title={error || undefined}
        className="inline-flex items-center gap-2 rounded-xl border border-[#AB9FF2]/70 bg-[#AB9FF2] px-3 py-2 text-xs font-medium text-[#17131f] shadow-[0_8px_24px_rgba(171,159,242,0.16)] transition hover:border-[#b8adf5] hover:bg-[#b8adf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AB9FF2]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07110d] active:bg-[#9d90e8] disabled:opacity-50"
      >
        <span className={`h-2 w-2 rounded-full ${available ? "bg-[#2b2140]" : "bg-[#2b2140]/55"}`} />
        {connecting
          ? "Connecting…"
          : !available && isMobileBrowser()
            ? "Open in Phantom"
            : compact
              ? "Connect Phantom"
              : "Connect Phantom wallet"}
      </button>
      {!available && !isMobileBrowser() && error && (
        <span className="hidden text-[10px] text-amber-200/60 lg:inline">Phantom not detected</span>
      )}
    </div>
  );
}
