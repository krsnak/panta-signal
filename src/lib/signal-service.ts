import "server-only";

import {
  getMarketHistory,
  getRecentlyObservedMarkets,
  recordMarketSnapshots,
  type MarketHistoryPoint,
} from "@/lib/history";
import {
  getCurrentPublicRegistryMarkets,
  getMarketDetail,
  getMarketTrades,
  type PantaMarket,
} from "@/lib/panta";
import { isRelevantMarket, sanitizeProbabilityPair } from "@/lib/panta-core";
import {
  buildMarketSignal,
  isMeaningfulSignal,
  rankMarketSignals,
  type MarketSignal,
  type SignalQuoteState,
} from "@/lib/signal-model";
import { summarizeMarketTrades } from "@/lib/trade-signal";

function marketFromHistory(point: MarketHistoryPoint): PantaMarket {
  return {
    id: point.marketId,
    title: point.title,
    description: point.description,
    category: point.category,
    phase: point.phase,
    status: point.status,
    yesProbability: point.yesProbability,
    noProbability: point.noProbability,
    volumeUsdc: point.volumeUsdc,
    imageUrl: point.imageUrl,
  };
}

export async function getCanonicalMarketSignal(
  marketId: string,
  hours = 24,
): Promise<MarketSignal> {
  const [detailResult, tradesResult] = await Promise.allSettled([
    getMarketDetail(marketId),
    getMarketTrades(marketId, 50),
  ]);

  const detail =
    detailResult.status === "fulfilled" ? detailResult.value : null;
  const hasLiveQuote =
    detail !== null &&
    detail.yesProbability !== null &&
    detail.noProbability !== null;

  if (detail && isRelevantMarket(detail) && hasLiveQuote) {
    await recordMarketSnapshots([detail]);
  }

  const history = await getMarketHistory(marketId, hours);
  const latestHistory = history.at(-1) ?? null;

  if (!detail && !latestHistory) {
    throw new Error("No usable Panta market detail or stored observation is available");
  }

  const quoteState: SignalQuoteState =
    detail?.phase === "resolved"
      ? "resolved"
      : hasLiveQuote
        ? "live"
        : latestHistory
          ? "cached"
          : "unavailable";

  const baseMarket = detail ?? marketFromHistory(latestHistory as MarketHistoryPoint);
  const market = sanitizeProbabilityPair(
    quoteState === "cached" && latestHistory
      ? {
          ...baseMarket,
          yesProbability: latestHistory.yesProbability,
          noProbability: latestHistory.noProbability,
          volumeUsdc: baseMarket.volumeUsdc || latestHistory.volumeUsdc,
        }
      : baseMarket,
  );

  const quoteObservedAt =
    quoteState === "live" || quoteState === "resolved"
      ? Date.now()
      : latestHistory?.capturedAt ?? null;
  const activity =
    tradesResult.status === "fulfilled"
      ? summarizeMarketTrades(tradesResult.value)
      : null;

  return buildMarketSignal({
    market,
    history,
    activity,
    quoteState,
    quoteObservedAt,
  });
}

export async function getCanonicalSignalFeed(options?: {
  hours?: number;
  limit?: number;
  excludeMarketId?: string | null;
}) {
  const hours = Math.max(1, options?.hours ?? 24);
  const limit = Math.min(Math.max(options?.limit ?? 6, 1), 10);
  const [observed, currentMarkets] = await Promise.all([
    getRecentlyObservedMarkets(hours, Math.max(limit * 2, 10)),
    getCurrentPublicRegistryMarkets(20).catch(() => []),
  ]);
  const currentIds = new Set(currentMarkets.map((market) => market.id));
  const candidates = new Map<string, PantaMarket>();
  for (const market of currentMarkets) candidates.set(market.id, market);
  for (const market of observed) {
    if (currentIds.has(market.id) && isRelevantMarket(market)) {
      candidates.set(market.id, market);
    }
  }
  const settled = await Promise.allSettled(
    [...candidates.values()].map((market) => getCanonicalMarketSignal(market.id, hours)),
  );
  const failedCount = settled.filter((result) => result.status === "rejected").length;
  const signals = settled
    .filter(
      (result): result is PromiseFulfilledResult<MarketSignal> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((signal) => isRelevantMarket(signal.market))
    .filter((signal) => signal.kind !== "resolved")
    .filter((signal) => signal.market.id !== options?.excludeMarketId);

  return {
    signals: rankMarketSignals(signals.filter(isMeaningfulSignal)).slice(0, limit),
    observedCount: candidates.size,
    failedCount,
  };
}
