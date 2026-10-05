"use client";

import { useEffect, useMemo, useState } from "react";

type Opportunity = {
  action: "buy" | "sell";
  outcome: "yes" | "no";
  price: string;
  remainingShares: string;
  totalQuoteValue: string;
  quoteAsset: string;
  orderPubkey: string;
  maker: string;
  makerIntent: "buy" | "sell";
  makerOrderType: "bid" | "ask";
  priceLevelPubkey: string;
  orderId: string;
  timestamp: number | null;
};

type OrderBook = {
  source: "solana-onchain";
  marketId: string;
  programId: string;
  quoteAsset: string;
  slot: number;
  observedAt: string;
  counts: { activeOrders: number; buyOpportunities: number; sellOpportunities: number };
  best: Record<"buy" | "sell", Record<"yes" | "no", Opportunity | null>>;
  opportunities: { buy: Opportunity[]; sell: Opportunity[] };
};

function short(value: string) {
  return value.length <= 12 ? value : value.slice(0, 5) + "…" + value.slice(-5);
}

function formatNumber(value: string | null | undefined, digits = 4) {
  if (!value) return "—";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function spread(bid: Opportunity | null, ask: Opportunity | null) {
  if (!bid || !ask) return "—";
  const value = Number(ask.price) - Number(bid.price);
  if (!Number.isFinite(value)) return "—";
  return value < 0 ? "Crossed" : value.toFixed(4);
}

function outcomeStats(book: OrderBook, outcome: "yes" | "no") {
  return [...book.opportunities.buy, ...book.opportunities.sell]
    .filter((row) => row.outcome === outcome)
    .reduce(
      (acc, row) => ({
        shares: acc.shares + (Number(row.remainingShares) || 0),
        quote: acc.quote + (Number(row.totalQuoteValue) || 0),
      }),
      { shares: 0, quote: 0 },
    );
}

export default function LiveOrderBook({
  marketId,
  phase,
  initialBook,
}: {
  marketId: string;
  phase: string;
  initialBook: OrderBook | null;
}) {
  const isSecondary = phase.toLowerCase() === "secondary";
  const [book, setBook] = useState<OrderBook | null>(initialBook);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSecondary) return;
    let cancelled = false;
    async function refresh() {
      setRefreshing(true);
      try {
        const response = await fetch(
          "/api/panta/markets/" + encodeURIComponent(marketId) + "/orderbook?t=" + Date.now(),
          { cache: "no-store" },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Order book HTTP " + response.status);
        }
        const next = (await response.json()) as OrderBook;
        if (!cancelled) {
          setBook(next);
          setError(null);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Unable to refresh order book");
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isSecondary, marketId]);

  const rows = useMemo(() => {
    if (!book) return [];
    return [...book.opportunities.buy, ...book.opportunities.sell]
      .sort((left, right) => {
        if (left.outcome !== right.outcome) return left.outcome.localeCompare(right.outcome);
        if (left.makerIntent !== right.makerIntent) return left.makerIntent === "buy" ? -1 : 1;
        const leftPrice = Number(left.price);
        const rightPrice = Number(right.price);
        return left.makerIntent === "buy" ? rightPrice - leftPrice : leftPrice - rightPrice;
      })
      .slice(0, 20);
  }, [book]);

  if (!isSecondary) {
    return (
      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
        <div className="text-sm uppercase tracking-[0.18em] text-white/35">On-chain liquidity</div>
        <h2 className="mt-2 text-2xl font-semibold">Live limit orders</h2>
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-5 text-sm leading-6 text-white/45">
          Limit-order liquidity is a secondary-market feature. This market is currently in the{" "}
          <span className="font-medium text-white/70">{phase}</span> phase, so there is no secondary order book to display.
        </div>
      </section>
    );
  }

  const yesBid = book?.best.sell.yes ?? null;
  const yesAsk = book?.best.buy.yes ?? null;
  const noBid = book?.best.sell.no ?? null;
  const noAsk = book?.best.buy.no ?? null;
  const yesDepth = book ? outcomeStats(book, "yes") : null;
  const noDepth = book ? outcomeStats(book, "no") : null;

  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-white/35">On-chain liquidity</div>
          <h2 className="mt-2 text-2xl font-semibold">Live Order Book</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-2.5 py-1 font-medium text-cyan-100/75">Solana · on-chain</span>
          {book && <span className="text-white/30">slot {book.slot.toLocaleString()} · {new Date(book.observedAt).toLocaleTimeString("en-GB")}</span>}
          <span className={refreshing ? "text-amber-200/70" : "text-emerald-200/60"}>{refreshing ? "refreshing…" : "5s live refresh"}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/65">
          Live refresh failed: {error}. {book ? "Showing the last successful on-chain snapshot." : "No order-book snapshot is available."}
        </div>
      )}

      {!book ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-5 text-sm text-white/45">Order-book data is currently unavailable from Solana RPC.</div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              { label: "YES", bid: yesBid, ask: yesAsk, depth: yesDepth },
              { label: "NO", bid: noBid, ask: noAsk, depth: noDepth },
            ].map((side) => (
              <div key={side.label} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/80">{side.label}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-white/30">{book.quoteAsset}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div><div className="text-[10px] uppercase tracking-wide text-white/30">Best bid</div><div className="mt-1 text-lg font-semibold text-emerald-200">{formatNumber(side.bid?.price)}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wide text-white/30">Best ask</div><div className="mt-1 text-lg font-semibold text-rose-200">{formatNumber(side.ask?.price)}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wide text-white/30">Spread</div><div className="mt-1 text-lg font-semibold text-white/70">{spread(side.bid, side.ask)}</div></div>
                </div>
                <div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/35">
                  Depth: <span className="text-white/65">{side.depth?.shares.toLocaleString("en-US", { maximumFractionDigits: 4 }) ?? "0"} shares</span>
                  {" · "}
                  <span className="text-white/65">{side.depth?.quote.toLocaleString("en-US", { maximumFractionDigits: 4 }) ?? "0"} {book.quoteAsset}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-white/40"><span className="font-medium text-white/75">{book.counts.activeOrders}</span> active limit orders</div>
            <div className="text-xs text-white/30">{rows.length < book.counts.activeOrders ? "showing " + rows.length + " of " + book.counts.activeOrders : rows.length + " displayed"}</div>
          </div>

          {book.counts.activeOrders === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-5 text-sm leading-6 text-white/45">
              No active limit orders are currently posted for this market. A newly placed on-chain order should appear here on the next refresh; after cancellation it should disappear again.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/15">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/30">
                  <tr><th className="px-4 py-3 font-medium">Maker side</th><th className="px-4 py-3 font-medium">Outcome</th><th className="px-4 py-3 font-medium">Price</th><th className="px-4 py-3 font-medium">Remaining</th><th className="px-4 py-3 font-medium">Quote value</th><th className="px-4 py-3 font-medium">Maker</th><th className="px-4 py-3 font-medium">Order</th></tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.orderPubkey} className="border-b border-white/5 last:border-b-0">
                      <td className={"px-4 py-3 font-semibold " + (row.makerIntent === "buy" ? "text-emerald-200" : "text-rose-200")}>{row.makerIntent.toUpperCase()}</td>
                      <td className="px-4 py-3 text-white/70">{row.outcome.toUpperCase()}</td>
                      <td className="px-4 py-3 font-mono text-white/75">{formatNumber(row.price)}</td>
                      <td className="px-4 py-3 text-white/60">{formatNumber(row.remainingShares)} shares</td>
                      <td className="px-4 py-3 text-white/60">{formatNumber(row.totalQuoteValue)} {row.quoteAsset}</td>
                      <td className="px-4 py-3"><a href={"https://explorer.solana.com/address/" + row.maker} target="_blank" rel="noreferrer" className="font-mono text-cyan-100/65 transition hover:text-cyan-100">{short(row.maker)} ↗</a></td>
                      <td className="px-4 py-3"><a href={"https://explorer.solana.com/address/" + row.orderPubkey} target="_blank" rel="noreferrer" className="font-mono text-white/40 transition hover:text-white/70">{short(row.orderPubkey)} ↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 max-w-4xl text-xs leading-5 text-white/30">
            These are open Panta limit-order accounts read directly from Solana. BUY/SELL describes the maker&apos;s posted order intent; an open order is not a completed trade or fill.
          </p>
        </>
      )}
    </section>
  );
}
