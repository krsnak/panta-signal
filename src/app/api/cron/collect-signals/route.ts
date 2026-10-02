import { NextRequest, NextResponse } from "next/server";
import { collectMarketSnapshots } from "@/lib/collector";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (process.env.NODE_ENV === "production") {
    if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: "DATABASE_URL is required for durable production history" },
        { status: 503 },
      );
    }
  }

  try {
    const result = await collectMarketSnapshots();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Signal collection failed",
      },
      { status: 503 },
    );
  }
}
