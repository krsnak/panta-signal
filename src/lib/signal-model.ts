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

const SIGNAL_PRIORITY: Record<SignalKind, number> = {
  movement: 4,
  activity: 3,
  flat: 2,
  collecting: 1,
  resolved: 0,
};

export function rankMarketSignals(signals: MarketSignal[]) {
  return [...signals].sort((a, b) => {
    const priority = SIGNAL_PRIORITY[b.kind] - SIGNAL_PRIORITY[a.kind];
    if (priority !== 0) return priority;

    if (a.kind === "movement" && b.kind === "movement") {
      const aMove = Math.abs(a.movement.changePoints ?? 0);
      const bMove = Math.abs(b.movement.changePoints ?? 0);
      if (aMove !== bMove) return bMove - aMove;
    }

    if (a.kind === "activity" && b.kind === "activity") {
      const aTrades = a.activity24h?.tradeCount24h ?? 0;
      const bTrades = b.activity24h?.tradeCount24h ?? 0;
      if (aTrades !== bTrades) return bTrades - aTrades;

      const aShares =
        (a.activity24h?.yesShares24h ?? 0) +
        (a.activity24h?.noShares24h ?? 0);
      const bShares =
        (b.activity24h?.yesShares24h ?? 0) +
        (b.activity24h?.noShares24h ?? 0);
      if (aShares !== bShares) return bShares - aShares;
    }

    if (a.movement.observationCount !== b.movement.observationCount) {
      return b.movement.observationCount - a.movement.observationCount;
    }

    return (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
  });
}

export function formatSignalWindow(seconds: number | null) {
  if (seconds === null) return "collecting";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

export function describeMarketSignal(signal: MarketSignal) {
  const change = signal.movement.changePoints;
  const activity = signal.activity24h;

  if (signal.kind === "movement" && change !== null) {
    return `YES moved ${change >= 0 ? "+" : ""}${change.toFixed(1)} pts across ${formatSignalWindow(signal.movement.windowSeconds)}, based on ${signal.movement.observationCount} real observations.`;
  }

  if (signal.kind === "activity" && activity) {
    return `Probability is flat across ${signal.movement.observationCount} observations, but ${activity.tradeCount24h} trades moved ${activity.yesShares24h.toFixed(2)} YES and ${activity.noShares24h.toFixed(2)} NO shares in the last 24h.`;
  }

  if (signal.kind === "flat") {
    return `No material probability move is visible across ${signal.movement.observationCount} stored observations. Panta Signal keeps the market visible without inventing a mover.`;
  }

  if (signal.kind === "resolved") {
    return "This market is resolved, so it is not promoted as an active trading signal.";
  }

  return "The current quote is available, but more durable observations are required before a movement signal can be calculated.";
}
