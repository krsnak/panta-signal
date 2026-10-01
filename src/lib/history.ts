import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PantaMarket } from "@/lib/panta";

export type MarketHistoryPoint = {
  marketId: string;
  title: string;
  category: string;
  yesProbability: number;
  noProbability: number | null;
  volumeUsdc: number;
  capturedAt: number;
};

export type MarketMover = {
  market: PantaMarket;
  baseline: MarketHistoryPoint;
  latest: MarketHistoryPoint;
  changePoints: number;
  insight: string;
};

type HistoryFile = {
  version: 1;
  points: MarketHistoryPoint[];
};

const MIN_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const MAX_HISTORY_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_POINTS = 5000;

let writeQueue: Promise<void> = Promise.resolve();

function historyPath() {
  const base = process.env.VERCEL
    ? path.join("/tmp", "panta-signal-data")
    : path.join(process.cwd(), ".panta-signal-data");
  return {
    dir: base,
    file: path.join(base, "market-history.json"),
    temp: path.join(base, "market-history.tmp"),
  };
}

async function readHistory(): Promise<HistoryFile> {
  const { file } = historyPath();
  try {
    const raw = await readFile(/* turbopackIgnore: true */ file, "utf8");
    const parsed = JSON.parse(raw) as Partial<HistoryFile>;
    return {
      version: 1,
      points: Array.isArray(parsed.points) ? parsed.points : [],
    };
  } catch {
    return { version: 1, points: [] };
  }
}

async function writeHistory(data: HistoryFile) {
  const { dir, file, temp } = historyPath();
  await mkdir(dir, { recursive: true });
  await writeFile(temp, JSON.stringify(data), "utf8");
  await rename(temp, file);
}

export async function recordMarketSnapshots(markets: PantaMarket[]) {
  const now = Date.now();
  const eligible = markets.filter(
    (market) => market.yesProbability !== null && Number.isFinite(market.yesProbability),
  );
  if (eligible.length === 0) return;

  writeQueue = writeQueue.then(async () => {
    const history = await readHistory();
    const cutoff = now - MAX_HISTORY_AGE_MS;
    const recent = history.points.filter((point) => point.capturedAt >= cutoff);

    for (const market of eligible) {
      const last = [...recent]
        .reverse()
        .find((point) => point.marketId === market.id);
      if (last && now - last.capturedAt < MIN_SNAPSHOT_INTERVAL_MS) continue;

      recent.push({
        marketId: market.id,
        title: market.title,
        category: market.category,
        yesProbability: market.yesProbability as number,
        noProbability: market.noProbability,
        volumeUsdc: market.volumeUsdc,
        capturedAt: now,
      });
    }

    await writeHistory({
      version: 1,
      points: recent.slice(-MAX_POINTS),
    });
  });

  await writeQueue;
}

export async function getMarketHistory(marketId: string, hours = 24) {
  await writeQueue;
  const history = await readHistory();
  const cutoff = Date.now() - Math.max(hours, 1) * 60 * 60 * 1000;
  return history.points
    .filter((point) => point.marketId === marketId && point.capturedAt >= cutoff)
    .sort((a, b) => a.capturedAt - b.capturedAt);
}

function buildInsight(baseline: MarketHistoryPoint, latest: MarketHistoryPoint) {
  const from = Math.round(baseline.yesProbability * 100);
  const to = Math.round(latest.yesProbability * 100);
  const change = (latest.yesProbability - baseline.yesProbability) * 100;
  const direction =
    Math.abs(change) < 0.05 ? "held near" : change > 0 ? "rose from" : "fell from";

  if (direction === "held near") {
    return `YES probability held near ${to}% across the observed snapshots. This describes market pricing, not a forecast or recommendation.`;
  }

  return `YES probability ${direction} ${from}% to ${to}% (${change > 0 ? "+" : ""}${change.toFixed(1)} pts). This describes observed market pricing, not a forecast or recommendation.`;
}

export async function getTopMovers(markets: PantaMarket[], hours = 24): Promise<MarketMover[]> {
  await writeQueue;
  const history = await readHistory();
  const cutoff = Date.now() - Math.max(hours, 1) * 60 * 60 * 1000;

  const movers: MarketMover[] = [];
  for (const market of markets) {
    if (market.yesProbability === null) continue;
    const points = history.points
      .filter((point) => point.marketId === market.id && point.capturedAt >= cutoff)
      .sort((a, b) => a.capturedAt - b.capturedAt);
    if (points.length < 2) continue;

    const baseline = points[0];
    const latest = points[points.length - 1];
    const changePoints = (latest.yesProbability - baseline.yesProbability) * 100;
    movers.push({
      market,
      baseline,
      latest,
      changePoints,
      insight: buildInsight(baseline, latest),
    });
  }

  return movers
    .sort((a, b) => Math.abs(b.changePoints) - Math.abs(a.changePoints))
    .slice(0, 5);
}

export async function getMarketInsight(market: PantaMarket, hours = 24) {
  const points = await getMarketHistory(market.id, hours);
  if (points.length < 2) {
    return {
      status: "collecting" as const,
      text: "Collecting a second price snapshot before calculating a movement signal.",
      points,
    };
  }

  return {
    status: "ready" as const,
    text: buildInsight(points[0], points[points.length - 1]),
    points,
  };
}
