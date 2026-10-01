import { NextRequest, NextResponse } from "next/server";
import { getWalletPositions } from "@/lib/panta";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.trim();
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  try {
    const positions = await getWalletPositions(wallet);
    return NextResponse.json({ wallet, positions }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load positions";
    if (message === "Invalid Solana wallet address") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (
      message.includes("Panta API 502") ||
      message.includes("Panta API 503") ||
      message.includes("Panta API 504") ||
      message.includes("Panta API timeout")
    ) {
      return NextResponse.json(
        { error: "Panta positions are temporarily unavailable. Please retry in a moment." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
}
