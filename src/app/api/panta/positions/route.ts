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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load positions" },
      { status: 502 },
    );
  }
}
