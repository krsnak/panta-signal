import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/panta";
import { getHistoryBackendStatus } from "@/lib/history";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const [pantaResult, history] = await Promise.all([
    (async () => {
      const pantaStarted = Date.now();
      const snapshot = await getMarketSnapshot({ limit: 1 });
      return {
        ok: snapshot.source === "panta",
        latencyMs: Date.now() - pantaStarted,
        error: snapshot.source === "panta" ? null : snapshot.error,
      };
    })(),
    getHistoryBackendStatus(),
  ]);

  const healthy =
    pantaResult.ok &&
    history.reachable &&
    (process.env.NODE_ENV !== "production" || history.backend === "postgres");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      services: {
        panta: pantaResult,
        history,
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
