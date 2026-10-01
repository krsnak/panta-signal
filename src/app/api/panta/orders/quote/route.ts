import { NextRequest, NextResponse } from "next/server";
import { quotePrimaryBuy } from "@/lib/panta";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      wallet?: string;
      marketId?: string;
      side?: "yes" | "no";
      amountUsdc?: string;
    };
    if (!body.wallet || !body.marketId || !body.side || !body.amountUsdc) {
      return NextResponse.json({ error: "wallet, marketId, side and amountUsdc are required" }, { status: 400 });
    }
    const quote = await quotePrimaryBuy({
      wallet: body.wallet,
      marketId: body.marketId,
      side: body.side,
      amountUsdc: body.amountUsdc,
    });
    return NextResponse.json(quote, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to quote order" },
      { status: 502 },
    );
  }
}
