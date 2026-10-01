import { NextRequest, NextResponse } from "next/server";
import { submitPrimaryBuy } from "@/lib/panta";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      orderId?: string;
      signature?: string;
      wallet?: string;
    };
    if (!body.orderId || !body.signature) {
      return NextResponse.json({ error: "orderId and signature are required" }, { status: 400 });
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
