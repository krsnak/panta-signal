import { NextRequest, NextResponse } from "next/server";
import { getMarketHistory } from "@/lib/history";

export async function GET(request: NextRequest) {
  const marketId = request.nextUrl.searchParams.get("marketId")?.trim();
  if (!marketId) {
    return NextResponse.json({ error: "marketId is required" }, { status: 400 });
  }

  const points = await getMarketHistory(marketId, 24);
  return NextResponse.json(
    { marketId, windowHours: 24, points },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
