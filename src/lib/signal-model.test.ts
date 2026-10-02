import { describe, expect, it } from "vitest";
import type { MarketHistoryPoint } from "./history";
import type { PantaMarket } from "./panta-core";
import { buildMarketSignal } from "./signal-model";
import type { MarketActivitySummary } from "./trade-signal";

const market: PantaMarket = {
  id: "market-1",
  title: "Will X happen?",
  description: "",
  category: "other",
  phase: "secondary",
  status: "secondary",
  yesProbability: 0.58,
  noProbability: 0.42,
  volumeUsdc: 25,
  imageUrl: null,
};

function point(
  yesProbability: number,
  capturedAt: number,
): MarketHistoryPoint {
  return {
    marketId: market.id,
    title: market.title,
    description: "",
    category: market.category,
    phase: market.phase,
    status: market.status,
    imageUrl: null,
    yesProbability,
    noProbability: 1 - yesProbability,
    volumeUsdc: market.volumeUsdc,
    capturedAt,
  };
}

const noActivity: MarketActivitySummary = {
  tradeCount24h: 0,
  primaryCount24h: 0,
  secondaryCount24h: 0,
  yesShares24h: 0,
  noShares24h: 0,
  latestTradeAt: null,
  observedRows: 0,
};

describe("canonical market signal", () => {
  it("classifies a real observed price move", () => {
    const signal = buildMarketSignal({
      market,
      history: [point(0.5, 1_000_000), point(0.58, 4_600_000)],
      activity: noActivity,
      quoteState: "live",
      quoteObservedAt: 4_600_000,
      nowMs: 4_900_000,
    });

    expect(signal.kind).toBe("movement");
    expect(signal.movement.changePoints).toBeCloseTo(8);
    expect(signal.movement.windowSeconds).toBe(3600);
    expect(signal.current.ageSeconds).toBe(300);
  });

  it("uses trade activity when price is flat", () => {
    const signal = buildMarketSignal({
      market: { ...market, yesProbability: 0.52, noProbability: 0.48 },
      history: [point(0.52, 1_000_000), point(0.52, 4_600_000)],
      activity: {
        ...noActivity,
        tradeCount24h: 2,
        primaryCount24h: 2,
        yesShares24h: 21.61,
        latestTradeAt: 4_500_000,
      },
      quoteState: "live",
      quoteObservedAt: 4_600_000,
      nowMs: 4_900_000,
    });

    expect(signal.kind).toBe("activity");
    expect(signal.movement.changePoints).toBe(0);
    expect(signal.activity24h.yesShares24h).toBe(21.61);
  });

  it("marks a fully observed quiet market as flat", () => {
    const signal = buildMarketSignal({
      market: { ...market, yesProbability: 0.5, noProbability: 0.5 },
      history: [point(0.5, 1_000_000), point(0.5, 4_600_000)],
      activity: noActivity,
      quoteState: "cached",
      quoteObservedAt: 4_600_000,
      nowMs: 4_900_000,
    });

    expect(signal.kind).toBe("flat");
    expect(signal.quoteState).toBe("cached");
  });

  it("uses collecting state when history is insufficient", () => {
    const signal = buildMarketSignal({
      market,
      history: [point(0.58, 4_600_000)],
      activity: noActivity,
      quoteState: "live",
      quoteObservedAt: 4_600_000,
      nowMs: 4_900_000,
    });

    expect(signal.kind).toBe("collecting");
    expect(signal.movement.changePoints).toBeNull();
    expect(signal.movement.observationCount).toBe(1);
  });

  it("never promotes a resolved market as an active signal", () => {
    const signal = buildMarketSignal({
      market: {
        ...market,
        phase: "resolved",
        yesProbability: 1,
        noProbability: 0,
      },
      history: [point(0.5, 1_000_000), point(1, 4_600_000)],
      activity: noActivity,
      quoteState: "resolved",
      quoteObservedAt: 4_600_000,
      nowMs: 4_900_000,
    });

    expect(signal.kind).toBe("resolved");
  });
});
