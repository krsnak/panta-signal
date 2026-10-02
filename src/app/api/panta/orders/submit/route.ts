import { NextRequest, NextResponse } from "next/server";
import { submitPrimaryBuy } from "@/lib/panta";
import {
  isOpaqueSessionId,
  isSolanaPublicKey,
  isSolanaSignature,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      orderId?: string;
      signature?: string;
      wallet?: string;
    };
    if (!isOpaqueSessionId(body.orderId)) {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }
    if (!isSolanaSignature(body.signature)) {
      return NextResponse.json({ error: "Invalid Solana transaction signature" }, { status: 400 });
    }
    if (body.wallet !== undefined && !isSolanaPublicKey(body.wallet)) {
      return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
    }
    const result = await submitPrimaryBuy({
      orderId: body.orderId,
      signature: body.signature,
      wallet: body.wallet,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit order" },
      { status: 502 },
    );
  }
}
