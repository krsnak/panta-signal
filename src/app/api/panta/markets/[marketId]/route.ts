import { NextRequest, NextResponse } from "next/server";
import { getMarketDetail } from "@/lib/panta";
import {
  getLatestMarketSnapshot,
  recordMarketSnapshots,
} from "@/lib/history";

type RouteContext = {
  params: Promise<{ marketId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { marketId } = await context.params;
  try {
    const decoded = decodeURIComponent(marketId);
    const market = await getMarketDetail(decoded);
    const liveQuote =
      market.yesProbability !== null && market.noProbability !== null;
    if (liveQuote && market.phase !== "resolved") {
      await recordMarketSnapshots([market]);
    }
    const cached = liveQuote ? null : await getLatestMarketSnapshot(decoded, 24);
    const quoteState =
      market.phase === "resolved"
        ? "resolved"
        : liveQuote
          ? "live"
          : cached
            ? "cached"
            : "unavailable";
    const observedAt =
      quoteState === "live"
        ? Date.now()
        : cached?.capturedAt ?? null;
    const ageSeconds =
      observedAt === null ? null : Math.max(0, Math.round((Date.now() - observedAt) / 1000));
    const responseMarket =
      quoteState === "cached" && cached
        ? {
            ...market,
            yesProbability: cached.yesProbability,
            noProbability: cached.noProbability,
            volumeUsdc: market.volumeUsdc || cached.volumeUsdc,
          }
        : market;

    return NextResponse.json(
      {
        market: responseMarket,
        quoteState,
        observedAt,
        ageSeconds,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20",
        },
      },
    );
  } catch (error) {
    const decoded = decodeURIComponent(marketId);
    const cached = await getLatestMarketSnapshot(decoded, 24).catch(() => null);
    if (cached) {
      const observedAt = cached.capturedAt;
      const ageSeconds = Math.max(0, Math.round((Date.now() - observedAt) / 1000));
      return NextResponse.json(
        {
          market: {
            id: cached.marketId,
            title: cached.title,
            description: cached.description,
            category: cached.category,
            phase: cached.phase,
            status: cached.status,
            imageUrl: cached.imageUrl,
            yesProbability: cached.yesProbability,
            noProbability: cached.noProbability,
            volumeUsdc: cached.volumeUsdc,
          },
          quoteState: "cached",
          observedAt,
          ageSeconds,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20",
          },
        },
      );
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load market",
      },
      { status: 503 },
    );
  }
}
