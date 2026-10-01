import { NextRequest, NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/panta";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const snapshot = await getMarketSnapshot({
    query: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    limit: Number(searchParams.get("limit") || 12),
  });

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45",
    },
  });
}
