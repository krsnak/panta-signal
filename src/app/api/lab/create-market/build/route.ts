import { NextRequest, NextResponse } from "next/server";
import { buildMarketCreate } from "@/lib/panta";
import {
  bootstrapAuthorized,
  bootstrapEnabled,
} from "@/lib/bootstrap-auth";
import { isOpaqueSessionId, isSolanaPublicKey } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!bootstrapEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!bootstrapAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as { createId?: string; wallet?: string };
    if (!isOpaqueSessionId(body.createId)) {
      return NextResponse.json({ error: "Invalid createId" }, { status: 400 });
    }
    if (!isSolanaPublicKey(body.wallet)) {
      return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
    }
    const built = await buildMarketCreate({ createId: body.createId, wallet: body.wallet });
    return NextResponse.json(built, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create build failed" },
      { status: 502 },
    );
  }
}
