import { NextRequest, NextResponse } from "next/server";
import { PantaApiError, quotePrimaryBuy } from "@/lib/panta";
import {
  isMarketSide,
  isPositiveUsdcAmount,
  isSolanaPublicKey,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      wallet?: string;
      marketId?: string;
      side?: "yes" | "no";
      amountUsdc?: string;
    };
    if (!isSolanaPublicKey(body.wallet)) {
      return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
    }
    if (!isSolanaPublicKey(body.marketId)) {
      return NextResponse.json({ error: "Invalid Panta market address" }, { status: 400 });
    }
    if (!isMarketSide(body.side)) {
      return NextResponse.json({ error: "side must be yes or no" }, { status: 400 });
    }
    if (!isPositiveUsdcAmount(body.amountUsdc)) {
      return NextResponse.json({ error: "amountUsdc must be a positive USDC amount with up to 6 decimals" }, { status: 400 });
    }
    const quote = await quotePrimaryBuy({
      wallet: body.wallet,
      marketId: body.marketId,
      side: body.side,
      amountUsdc: body.amountUsdc,
    });
    return NextResponse.json(quote, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PantaApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to quote order" },
      { status: 502 },
    );
  }
}
