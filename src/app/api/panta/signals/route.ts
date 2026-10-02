import { NextRequest, NextResponse } from "next/server";
import { getCanonicalSignalFeed } from "@/lib/signal-service";

export async function GET(request: NextRequest) {
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "6");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 10)
    : 6;
  const excludeMarketId =
    request.nextUrl.searchParams.get("excludeMarketId")?.trim() || null;

  try {
    const feed = await getCanonicalSignalFeed({
      hours: 24,
      limit,
      excludeMarketId,
    });
    return NextResponse.json(
      {
        signals: feed.signals,
        meta: {
          observedCount: feed.observedCount,
          failedCount: feed.failedCount,
        },
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
        error:
          error instanceof Error
            ? error.message
            : "Unable to build Panta signal feed",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
