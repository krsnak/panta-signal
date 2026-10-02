import { NextRequest, NextResponse } from "next/server";
import { getMarketDetail } from "@/lib/panta";

type RouteContext = {
  params: Promise<{ marketId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { marketId } = await context.params;
  try {
    const market = await getMarketDetail(decodeURIComponent(marketId));
    return NextResponse.json(
      { market },
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
