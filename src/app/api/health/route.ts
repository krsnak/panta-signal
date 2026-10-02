import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/panta";
import {
  getHistoryBackendStatus,
  getSignalCoverage,
} from "@/lib/history";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const [pantaResult, history, signalCoverage] = await Promise.all([
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
    getSignalCoverage(24),
  ]);

  const collectorFresh =
    history.latestSnapshotAgeSeconds !== null &&
    history.latestSnapshotAgeSeconds <= 20 * 60;
  const healthy =
    pantaResult.ok &&
    history.reachable &&
    collectorFresh &&
    (process.env.NODE_ENV !== "production" || history.backend === "postgres");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      services: {
        panta: pantaResult,
        history: {
          ...history,
          collectorFresh,
        },
        signalCoverage,
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
