import { NextResponse } from "next/server";
import {
  PantaOrderBookError,
  readPantaOrderBook,
} from "@/lib/panta-orderbook";

type RouteContext = {
  params: Promise<{ marketId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { marketId } = await context.params;
  try {
    const orderBook = await readPantaOrderBook(decodeURIComponent(marketId));
    return NextResponse.json(orderBook, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    const status = error instanceof PantaOrderBookError ? error.status : 503;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read Panta order book" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

