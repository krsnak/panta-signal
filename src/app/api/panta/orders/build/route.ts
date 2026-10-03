import { NextRequest, NextResponse } from "next/server";
import { PantaApiError, buildPrimaryBuy } from "@/lib/panta";
import {
  isOpaqueSessionId,
  isSlippageBps,
  isSolanaPublicKey,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      quoteId?: string;
      wallet?: string;
      maxSlippageBps?: number;
    };
    if (!isOpaqueSessionId(body.quoteId)) {
      return NextResponse.json({ error: "Invalid quoteId" }, { status: 400 });
    }
    if (!isSolanaPublicKey(body.wallet)) {
      return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
    }
    if (body.maxSlippageBps !== undefined && !isSlippageBps(body.maxSlippageBps)) {
      return NextResponse.json({ error: "maxSlippageBps must be an integer between 0 and 5000" }, { status: 400 });
    }
    const order = await buildPrimaryBuy({
      quoteId: body.quoteId,
      wallet: body.wallet,
      maxSlippageBps: body.maxSlippageBps,
    });
    return NextResponse.json(order, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PantaApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to build order" },
      { status: 502 },
    );
  }
}
