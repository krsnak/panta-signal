import { NextRequest, NextResponse } from "next/server";
import { getMarketDetail, getWalletPositions } from "@/lib/panta";
import { getLatestMarketSnapshot } from "@/lib/history";
import { estimatePositionValue } from "@/lib/position-value";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.trim();
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  try {
    const positions = await getWalletPositions(wallet);
    const marketIds = Array.from(new Set(positions.map((position) => position.marketId))).slice(0, 8);
    const marketEntries = await Promise.all(
      marketIds.map(async (marketId) => {
        const [market, cached] = await Promise.all([
          getMarketDetail(marketId).catch(() => null),
          getLatestMarketSnapshot(marketId, 24).catch(() => null),
        ]);
        return [marketId, { market, cached }] as const;
      }),
    );
    const markets = new Map(marketEntries);
    const enriched = positions.map((position) => {
      const context = markets.get(position.marketId);
      const market = context?.market ?? null;
      const cached = context?.cached ?? null;
      const valuation = estimatePositionValue({
        shares: position.shares,
        side: position.side,
        outcome: position.outcome,
        liveYesPrice: market?.yesProbability ?? null,
        liveNoPrice: market?.noProbability ?? null,
        cachedYesPrice: cached?.yesProbability ?? null,
        cachedNoPrice: cached?.noProbability ?? null,
      });
      return {
        ...position,
        estimatedValueUsdc: valuation.estimatedValueUsdc,
        valuationUnitPrice: valuation.unitPrice,
        valuationState: valuation.state,
        valuationObservedAt:
          valuation.state === "cached" ? cached?.capturedAt ?? null : null,
        market: market
          ? {
              title: market.title,
              category: market.category,
              phase: market.phase,
              status: market.status,
              imageUrl: market.imageUrl,
              yesProbability: market.yesProbability,
              noProbability: market.noProbability,
            }
          : cached
            ? {
                title: cached.title,
                category: cached.category,
                phase: cached.phase,
                status: cached.status,
                imageUrl: cached.imageUrl,
                yesProbability: cached.yesProbability,
                noProbability: cached.noProbability,
              }
          : null,
      };
    });

    return NextResponse.json({ wallet, positions: enriched }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load positions";
    if (message === "Invalid Solana wallet address") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (
      message.includes("Panta API 502") ||
      message.includes("Panta API 503") ||
      message.includes("Panta API 504") ||
      message.includes("Panta API timeout")
    ) {
      return NextResponse.json(
        { error: "Panta positions are temporarily unavailable. Please retry in a moment." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
}
