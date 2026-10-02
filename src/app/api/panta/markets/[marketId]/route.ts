import { NextRequest, NextResponse } from "next/server";
import { getMarketDetail } from "@/lib/panta";
import { getLatestMarketSnapshot } from "@/lib/history";

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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load market",
      },
      { status: 503 },
    );
  }
}
