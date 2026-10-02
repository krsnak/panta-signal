import { describe, expect, it } from "vitest";
import { summarizeMarketTrades } from "./trade-signal";
import type { PantaTrade } from "./panta";

function trade(
  overrides: Partial<PantaTrade> = {},
): PantaTrade {
  return {
    id: "t1",
    wallet: "wallet",
    isPrimary: true,
    yesAmount: 2,
    noAmount: 0,
    feePaid: 0,
    blockTime: 1000,
    signature: "sig",
    quoteAsset: "usdc",
    ...overrides,
  };
}

describe("trade activity signal", () => {
  it("summarizes only the last 24 hours", () => {
    const nowMs = 2_000_000 * 1000;
    const recentTime = 2_000_000 - 60;
    const staleTime = 2_000_000 - 25 * 60 * 60;
    const summary = summarizeMarketTrades(
      [
        trade({ blockTime: recentTime, yesAmount: 3 }),
        trade({ id: "t2", blockTime: recentTime - 10, isPrimary: false, noAmount: 4 }),
        trade({ id: "old", blockTime: staleTime, yesAmount: 100 }),
      ],
      nowMs,
    );

    expect(summary.tradeCount24h).toBe(2);
    expect(summary.primaryCount24h).toBe(1);
    expect(summary.secondaryCount24h).toBe(1);
    expect(summary.yesShares24h).toBe(5);
    expect(summary.noShares24h).toBe(4);
    expect(summary.latestTradeAt).toBe(recentTime * 1000);
    expect(summary.latestTradeAgeSeconds).toBe(60);
    expect(summary.observedRows).toBe(3);
  });

  it("returns an empty summary when there is no recent trade", () => {
    const summary = summarizeMarketTrades([], 2_000_000 * 1000);
    expect(summary.tradeCount24h).toBe(0);
    expect(summary.latestTradeAt).toBeNull();
    expect(summary.latestTradeAgeSeconds).toBeNull();
  });
});
