import "server-only";

import { getMarketDetail, getMarketSnapshot, type PantaMarket } from "@/lib/panta";
import { recordMarketSnapshots } from "@/lib/history";

export type CollectionResult = {
  catalogCount: number;
  attempted: number;
  recorded: number;
  unavailable: number;
  collectedAt: string;
};

export async function collectMarketSnapshots(): Promise<CollectionResult> {
  const snapshot = await getMarketSnapshot({ limit: 20 });
  if (snapshot.source !== "panta") {
    throw new Error(snapshot.error || "Panta catalog is unavailable");
  }

  const candidates = snapshot.markets
    .filter(
      (market) =>
        market.phase !== "resolved" &&
        !market.title.startsWith("Market "),
    )
    .sort((a, b) => {
      const volumeDelta = b.volumeUsdc - a.volumeUsdc;
      if (volumeDelta !== 0) return volumeDelta;
      return a.phase === "primary" ? -1 : 1;
    })
    .slice(0, 12);

  const collected: PantaMarket[] = [];
  let unavailable = 0;
  const batchSize = 3;

  for (let start = 0; start < candidates.length; start += batchSize) {
    const batch = candidates.slice(start, start + batchSize);
    const results = await Promise.all(
      batch.map(async (market) => {
        try {
          const detail = await getMarketDetail(market.id);
          return {
            ...market,
            ...detail,
            title: detail.title.startsWith("Market ") ? market.title : detail.title,
            description: detail.description || market.description,
            imageUrl: detail.imageUrl || market.imageUrl,
            volumeUsdc: detail.volumeUsdc || market.volumeUsdc,
          };
        } catch {
          return null;
        }
      }),
    );

    for (const market of results) {
      if (
        market &&
        market.yesProbability !== null &&
        Number.isFinite(market.yesProbability)
      ) {
        collected.push(market);
      } else {
        unavailable += 1;
      }
    }
  }

  await recordMarketSnapshots(collected);

  return {
    catalogCount: snapshot.markets.length,
    attempted: candidates.length,
    recorded: collected.length,
    unavailable,
    collectedAt: new Date().toISOString(),
  };
}
