import { NextRequest, NextResponse } from "next/server";
import { buildPrimaryBuy } from "@/lib/panta";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      quoteId?: string;
      wallet?: string;
      maxSlippageBps?: number;
    };
    if (!body.quoteId || !body.wallet) {
      return NextResponse.json({ error: "quoteId and wallet are required" }, { status: 400 });
    }
    const order = await buildPrimaryBuy({
      quoteId: body.quoteId,
      wallet: body.wallet,
      maxSlippageBps: body.maxSlippageBps,
    });
    return NextResponse.json(order, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to build order" },
      { status: 502 },
    );
  }
}
