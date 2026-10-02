"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSolanaWallet } from "@/components/SolanaWalletProvider";

type Position = {
  marketId: string;
  category: string | null;
  side: string;
  shares: number;
  phase: string;
  claimable: boolean;
  claimed: boolean;
  outcome: string | null;
  market?: {
    title: string;
    category: string;
    phase: string;
    status: string;
    imageUrl: string | null;
    yesProbability: number | null;
    noProbability: number | null;
  } | null;
};

type ApiResponse = {
  wallet?: string;
  positions?: Position[];
  error?: string;
};

function pct(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export default function WalletPositionsLookup() {
  const {
    wallet: connectedWallet,
    connect,
    disconnect,
    connecting,
    error: walletError,
  } = useSolanaWallet();
  const [wallet, setWallet] = useState("");
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPositions = useCallback(async (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      setError("Enter a Solana wallet address.");
      setPositions(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/panta/positions?wallet=${encodeURIComponent(normalized)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(body.error || "Unable to load wallet positions");
      setPositions(body.positions ?? []);
    } catch (error) {
      setPositions(null);
      setError(error instanceof Error ? error.message : "Unable to load wallet positions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!connectedWallet) return;
    const sync = window.setTimeout(() => {
      setWallet(connectedWallet);
      void fetchPositions(connectedWallet);
    }, 0);
    return () => window.clearTimeout(sync);
  }, [connectedWallet, fetchPositions]);

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ wallet?: string }>).detail;
      const value = detail?.wallet || connectedWallet || wallet;
      if (!value) return;
      setWallet(value);
      window.setTimeout(() => void fetchPositions(value), 1500);
      window.setTimeout(() => void fetchPositions(value), 5000);
    };
    window.addEventListener("panta:order-confirmed", refresh);
    return () => window.removeEventListener("panta:order-confirmed", refresh);
  }, [connectedWallet, fetchPositions, wallet]);

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchPositions(wallet);
  }

  async function connectWallet() {
    try {
      const value = await connect();
      setWallet(value);
      await fetchPositions(value);
    } catch {
      // The shared wallet provider exposes a user-facing error.
    }
  }

  const visibleError = error || walletError;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {connectedWallet ? (
          <>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-2 text-xs font-medium text-emerald-200">
              Phantom {connectedWallet.slice(0, 4)}…{connectedWallet.slice(-4)}
            </span>
            <button
              type="button"
              onClick={() => void disconnect()}
              className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/45 transition hover:text-white/75"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={connecting}
            onClick={() => void connectWallet()}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#090d10] disabled:opacity-50"
          >
            {connecting ? "Connecting…" : "Connect Phantom"}
          </button>
        )}
        <span className="text-xs text-white/30">or inspect any public Solana address</span>
      </div>

      <form onSubmit={load} className="flex w-full max-w-xl gap-2">
        <input
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
          placeholder="Solana wallet address"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-medium text-emerald-200 disabled:cursor-wait disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load positions"}
        </button>
      </form>

      {visibleError && (
        <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.05] p-4 text-sm text-rose-100">
          {visibleError}
        </div>
      )}

      {positions && (
        <div className="mt-5">
          {positions.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/15 p-5 text-sm text-white/45">
              No Panta positions found for this wallet.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {positions.map((position, index) => (
                <div
                  key={`${position.marketId}-${position.side}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/15 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className={position.side === "yes" ? "font-medium text-emerald-300" : "font-medium text-rose-300"}>
                      {position.side.toUpperCase()}
                    </span>
                    <span className="text-xs text-white/35">{position.phase}</span>
                  </div>
                  <div className="mt-3 text-sm font-medium text-white/80">
                    {position.market?.title || "Panta market"}
                  </div>
                  <div className="mt-3 text-2xl font-semibold">{position.shares.toLocaleString()} shares</div>
                  {position.market && (
                    <div className="mt-2 text-xs text-white/40">
                      Current {position.side.toUpperCase()} quote:{" "}
                      {pct(position.side === "yes" ? position.market.yesProbability : position.market.noProbability)}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/35">
                    <span className="max-w-full truncate">{position.marketId}</span>
                    {position.claimable && !position.claimed && (
                      <span className="text-emerald-300">Claimable</span>
                    )}
                    {position.outcome && <span>Outcome: {position.outcome}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
