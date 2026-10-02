import { NextRequest, NextResponse } from "next/server";
import { registerMarketCreate } from "@/lib/panta";
import {
  bootstrapAuthorized,
  bootstrapEnabled,
} from "@/lib/bootstrap-auth";
import { isOpaqueSessionId, isSolanaSignature } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!bootstrapEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!bootstrapAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as { createId?: string; signature?: string };
    if (!isOpaqueSessionId(body.createId)) {
      return NextResponse.json({ error: "Invalid createId" }, { status: 400 });
    }
    if (!isSolanaSignature(body.signature)) {
      return NextResponse.json({ error: "Invalid Solana transaction signature" }, { status: 400 });
    }
    const registered = await registerMarketCreate({
      createId: body.createId,
      signature: body.signature,
    });
    return NextResponse.json(registered, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Market registration failed" },
      { status: 502 },
    );
  }
}
