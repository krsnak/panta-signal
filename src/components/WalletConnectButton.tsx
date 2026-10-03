"use client";

import { useEffect, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

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
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/[0.14]"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Phantom {wallet.slice(0, 4)}…{wallet.slice(-4)}
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-[270px] rounded-2xl border border-white/10 bg-[#10161a] p-3 shadow-2xl shadow-black/40"
          >
            <div className="px-2 pb-2">
              <div className="text-xs font-semibold text-white/80">Connected with Phantom</div>
              <div className="mt-1 break-all font-mono text-[10px] leading-4 text-white/35">{wallet}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-4 text-white/45">
              Phantom may reconnect this trusted site without another connection prompt. Every transaction still requires a separate wallet approval.
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await disconnect();
              }}
              disabled={disconnecting}
              className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2.5 text-left text-xs font-medium text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect this session"}
            </button>
            <p className="mt-2 px-2 text-[10px] leading-4 text-white/30">
              To require a new connection approval later, revoke this site from Phantom&apos;s connected/trusted apps settings.
            </p>
          </div>
        )}
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
