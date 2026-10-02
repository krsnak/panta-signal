import "server-only";

import {
  getMarketHistory,
  recordMarketSnapshots,
  type MarketHistoryPoint,
} from "@/lib/history";
import {
  getMarketDetail,
  getMarketTrades,
  type PantaMarket,
} from "@/lib/panta";
import {
  buildMarketSignal,
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

  if (detail && hasLiveQuote && detail.phase !== "resolved") {
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
  const market =
    quoteState === "cached" && latestHistory
      ? {
          ...baseMarket,
          yesProbability: latestHistory.yesProbability,
          noProbability: latestHistory.noProbability,
          volumeUsdc: baseMarket.volumeUsdc || latestHistory.volumeUsdc,
        }
      : baseMarket;

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
