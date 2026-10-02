import type { MarketHistoryPoint } from "@/lib/history";
import type { PantaMarket } from "@/lib/panta-core";
import type { MarketActivitySummary } from "@/lib/trade-signal";

export type SignalQuoteState =
  | "live"
  | "cached"
  | "unavailable"
  | "resolved";

export type SignalKind =
  | "movement"
  | "activity"
  | "flat"
  | "collecting"
  | "resolved";

export type MarketSignal = {
  market: PantaMarket;
  kind: SignalKind;
  quoteState: SignalQuoteState;
  current: {
    yesProbability: number | null;
    noProbability: number | null;
    volumeUsdc: number;
    observedAt: number | null;
    ageSeconds: number | null;
  };
  movement: {
    observationCount: number;
    baselineYesProbability: number | null;
    latestYesProbability: number | null;
    changePoints: number | null;
    firstObservedAt: number | null;
    latestObservedAt: number | null;
    windowSeconds: number | null;
  };
  activityState: "live" | "unavailable";
  activity24h: MarketActivitySummary | null;
  lastActivityAt: number | null;
};

function clampAgeSeconds(nowMs: number, timestamp: number | null) {
  if (timestamp === null) return null;
  return Math.max(0, Math.round((nowMs - timestamp) / 1000));
}

export function buildMarketSignal(input: {
  market: PantaMarket;
  history: MarketHistoryPoint[];
  activity: MarketActivitySummary | null;
  quoteState: SignalQuoteState;
  quoteObservedAt: number | null;
  nowMs?: number;
}): MarketSignal {
  const nowMs = input.nowMs ?? Date.now();
  const history = [...input.history].sort(
    (a, b) => a.capturedAt - b.capturedAt,
  );
  const first = history[0] ?? null;
  const latest = history.at(-1) ?? null;
  const currentYes =
    input.market.yesProbability ?? latest?.yesProbability ?? null;
  const currentNo =
    input.market.noProbability ?? latest?.noProbability ?? null;
  const latestObservedAt =
    input.quoteObservedAt ?? latest?.capturedAt ?? null;

  const hasMovementWindow =
    first !== null &&
    latest !== null &&
    history.length >= 2 &&
    currentYes !== null;
  const changePoints = hasMovementWindow
    ? (currentYes - first.yesProbability) * 100
    : null;
  const windowSeconds =
    hasMovementWindow && latestObservedAt !== null
      ? Math.max(
          0,
          Math.round((latestObservedAt - first.capturedAt) / 1000),
        )
      : null;

  let kind: SignalKind;
  if (input.quoteState === "resolved" || input.market.phase === "resolved") {
    kind = "resolved";
  } else if (changePoints !== null && Math.abs(changePoints) > 0.0001) {
    kind = "movement";
  } else if ((input.activity?.tradeCount24h ?? 0) > 0) {
    kind = "activity";
  } else if (hasMovementWindow) {
    kind = "flat";
  } else {
    kind = "collecting";
  }

  const lastActivityAt = Math.max(
    latestObservedAt ?? 0,
    input.activity?.latestTradeAt ?? 0,
  ) || null;

  return {
    market: input.market,
    kind,
    quoteState: input.quoteState,
    current: {
      yesProbability: currentYes,
      noProbability: currentNo,
      volumeUsdc: input.market.volumeUsdc,
      observedAt: latestObservedAt,
      ageSeconds: clampAgeSeconds(nowMs, latestObservedAt),
    },
    movement: {
      observationCount: history.length,
      baselineYesProbability: first?.yesProbability ?? null,
      latestYesProbability: currentYes,
      changePoints,
      firstObservedAt: first?.capturedAt ?? null,
      latestObservedAt,
      windowSeconds,
    },
    activityState: input.activity ? "live" : "unavailable",
    activity24h: input.activity,
    lastActivityAt,
  };
}
