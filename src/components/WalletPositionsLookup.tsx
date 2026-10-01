"use client";

import { FormEvent, useState } from "react";

type Position = {
  marketId: string;
  category: string | null;
  side: string;
  shares: number;
  phase: string;
  claimable: boolean;
  claimed: boolean;
  outcome: string | null;
};

type ApiResponse = {
  wallet?: string;
  positions?: Position[];
  error?: string;
};

export default function WalletPositionsLookup() {
  const [wallet, setWallet] = useState("");
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = wallet.trim();
    if (!value) {
      setError("Enter a Solana wallet address.");
      setPositions(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPositions(null);
    try {
      const response = await fetch(
        `/api/panta/positions?wallet=${encodeURIComponent(value)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(body.error || "Unable to load wallet positions");
      setPositions(body.positions ?? []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load wallet positions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
          {loading ? "Loading…" : "Load"}
        </button>
      </form>

      {error && (
        <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.05] p-4 text-sm text-rose-100">
          {error}
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
                  <div className="mt-3 text-2xl font-semibold">{position.shares.toLocaleString()} shares</div>
                  <div className="mt-2 truncate text-xs text-white/35">{position.marketId}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
