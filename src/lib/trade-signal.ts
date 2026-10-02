import type { PantaTrade } from "@/lib/panta";

export type MarketActivitySummary = {
  tradeCount24h: number;
  primaryCount24h: number;
  secondaryCount24h: number;
  yesShares24h: number;
  noShares24h: number;
  latestTradeAt: number | null;
  observedRows: number;
};

export function summarizeMarketTrades(
  trades: PantaTrade[],
  nowMs = Date.now(),
): MarketActivitySummary {
  const cutoffSec = Math.floor((nowMs - 24 * 60 * 60 * 1000) / 1000);
  const recent = trades.filter(
    (trade) => trade.blockTime !== null && trade.blockTime >= cutoffSec,
  );

  return {
    tradeCount24h: recent.length,
    primaryCount24h: recent.filter((trade) => trade.isPrimary).length,
    secondaryCount24h: recent.filter((trade) => !trade.isPrimary).length,
    yesShares24h: recent.reduce((sum, trade) => sum + trade.yesAmount, 0),
    noShares24h: recent.reduce((sum, trade) => sum + trade.noAmount, 0),
    latestTradeAt:
      recent.length === 0
        ? null
        : Math.max(
            ...recent
              .map((trade) => trade.blockTime)
              .filter((value): value is number => value !== null),
          ) * 1000,
    observedRows: trades.length,
  };
}
