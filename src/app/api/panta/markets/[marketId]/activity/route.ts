import { NextResponse } from "next/server";
import { getMarketTrades } from "@/lib/panta";
import { summarizeMarketTrades } from "@/lib/trade-signal";

type RouteContext = {
  params: Promise<{ marketId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { marketId } = await context.params;
  try {
    const trades = await getMarketTrades(decodeURIComponent(marketId), 50);
    return NextResponse.json(
      {
        activity: summarizeMarketTrades(trades),
        trades: trades.slice(0, 20).map((trade) => ({
          signature: trade.signature,
          wallet: trade.wallet,
          isPrimary: trade.isPrimary,
          yesAmount: trade.yesAmount,
          noAmount: trade.noAmount,
          blockTime: trade.blockTime,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load market activity",
      },
      { status: 503 },
    );
  }
}
