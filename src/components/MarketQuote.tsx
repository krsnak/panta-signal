"use client";

import { useEffect, useState } from "react";

type MarketQuoteProps = {
  marketId: string;
  compact?: boolean;
  initialQuote?: {
    yesProbability: number | null;
    noProbability: number | null;
    phase: string;
    volumeUsdc: number;
  };
};

type ApiResponse = {
  market?: {
    yesProbability: number | null;
    noProbability: number | null;
    phase: string;
    volumeUsdc: number;
  };
  quoteState?: "live" | "cached" | "resolved" | "unavailable";
  ageSeconds?: number | null;
};

function pct(value: number | null) {
  if (value === null) return "—";
  if (value === 0 || value === 1) return `${value * 100}%`;
  return `${(value * 100).toFixed(1)}%`;
}

export default function MarketQuote({ marketId, compact = false, initialQuote }: MarketQuoteProps) {
  const [quote, setQuote] = useState<{ yes: number | null; no: number | null } | null>(
    initialQuote
      ? { yes: initialQuote.yesProbability, no: initialQuote.noProbability }
      : null,
  );
  const [phase, setPhase] = useState<string | null>(initialQuote?.phase ?? null);
  const [volumeUsdc, setVolumeUsdc] = useState<number | null>(initialQuote?.volumeUsdc ?? null);
  const [quoteState, setQuoteState] = useState<ApiResponse["quoteState"] | null>(null);
  const [ageSeconds, setAgeSeconds] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const hasMeaningfulPriceDiscovery =
    quote !== null &&
    quote.yes !== null &&
    quote.no !== null &&
    !(
      Math.abs(quote.yes - 0.5) < 0.000001 &&
      Math.abs(quote.no - 0.5) < 0.000001 &&
      (volumeUsdc ?? 0) <= 0
    );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setFailed(true);
      controller.abort();
    }, 5000);
    fetch(`/api/panta/markets/${encodeURIComponent(marketId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("quote unavailable");
        const body = (await response.json()) as ApiResponse;
        setQuote({
          yes: body.market?.yesProbability ?? null,
          no: body.market?.noProbability ?? null,
        });
        setPhase(body.market?.phase ?? null);
        setVolumeUsdc(body.market?.volumeUsdc ?? null);
        setQuoteState(body.quoteState ?? "unavailable");
        setAgeSeconds(body.ageSeconds ?? null);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setFailed(true);
      });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [marketId]);

  if (compact) {
    const stateLabel =
      quoteState === "cached"
        ? ageSeconds !== null
          ? `cached ${Math.max(1, Math.round(ageSeconds / 60))}m`
          : "cached"
        : quoteState === "live"
          ? "live"
          : quoteState === "resolved"
            ? "resolved"
            : failed
              ? "unavailable"
              : quote
                ? "refreshing"
                : null;
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="text-emerald-300/75">YES {quote ? pct(quote.yes) : "—"}</span>
        <span className="text-rose-300/75">NO {quote ? pct(quote.no) : "—"}</span>
        {stateLabel && <span className="text-white/25">{stateLabel}</span>}
        {phase && <span className="text-white/25">{phase}</span>}
      </div>
    );
  }

  if (!hasMeaningfulPriceDiscovery) {
    const parts = [
      phase ? phase + " market" : "Current market",
      (volumeUsdc ?? 0) <= 0 ? "no recorded volume" : null,
      quoteState === "cached" && ageSeconds !== null
        ? "last quote " + Math.max(1, Math.round(ageSeconds / 60)) + "m ago"
        : null,
    ].filter(Boolean);

    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3">
        <div className="text-sm font-medium text-white/60">No active price discovery</div>
        <div className="mt-1 text-[11px] leading-5 text-white/30">
          {parts.join(" · ")}
        </div>
      </div>
    );
  }

  const stateLabel =
    quoteState === "cached"
      ? ageSeconds !== null
        ? `Cached ${Math.max(1, Math.round(ageSeconds / 60))} min ago`
        : "Cached quote"
      : quoteState === "live"
        ? "Live quote"
        : quoteState === "resolved"
          ? "Resolved outcome"
          : failed || quoteState === "unavailable"
            ? "Quote unavailable"
            : quote
              ? "Refreshing live quote…"
              : "Quote unavailable";

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-emerald-300/[0.08] px-3 py-2.5 text-emerald-200">
          <span className="text-xs text-white/35">YES</span>
          <span className="float-right font-semibold">{quote ? pct(quote.yes) : "—"}</span>
        </div>
        <div className="rounded-xl bg-rose-300/[0.07] px-3 py-2.5 text-rose-200">
          <span className="text-xs text-white/35">NO</span>
          <span className="float-right font-semibold">{quote ? pct(quote.no) : "—"}</span>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-white/25">
        {stateLabel}
        {phase ? ` · ${phase}` : ""}
        {volumeUsdc !== null
          ? ` · ${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            }).format(volumeUsdc)} vol.`
          : ""}
      </div>
    </div>
  );
}
