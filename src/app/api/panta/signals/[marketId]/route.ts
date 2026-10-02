import { NextResponse } from "next/server";
import { getCanonicalMarketSignal } from "@/lib/signal-service";

type RouteContext = {
  params: Promise<{ marketId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { marketId } = await context.params;
  try {
    const signal = await getCanonicalMarketSignal(decodeURIComponent(marketId));
    return NextResponse.json(
      { signal },
      {
        headers: {
          "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to build Panta market signal",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
