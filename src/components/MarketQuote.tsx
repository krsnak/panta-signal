"use client";

import { useEffect, useRef, useState } from "react";

type MarketQuoteProps = {
  marketId: string;
  compact?: boolean;
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

export default function MarketQuote({ marketId, compact = false }: MarketQuoteProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [quote, setQuote] = useState<{ yes: number | null; no: number | null } | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [volumeUsdc, setVolumeUsdc] = useState<number | null>(null);
  const [quoteState, setQuoteState] = useState<ApiResponse["quoteState"] | null>(null);
  const [ageSeconds, setAgeSeconds] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
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
    return () => controller.abort();
  }, [marketId, visible]);

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
              : null;
    return (
      <div ref={ref} className="flex items-center gap-3 text-xs">
        <span className="text-emerald-300/75">YES {quote ? pct(quote.yes) : "…"}</span>
        <span className="text-rose-300/75">NO {quote ? pct(quote.no) : "…"}</span>
        {stateLabel && <span className="text-white/25">{stateLabel}</span>}
        {phase && <span className="text-white/25">{phase}</span>}
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
            : "Loading live quote…";

  return (
    <div ref={ref}>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-emerald-300/[0.08] px-3 py-2.5 text-emerald-200">
          <span className="text-xs text-white/35">YES</span>
          <span className="float-right font-semibold">{quote ? pct(quote.yes) : "…"}</span>
        </div>
        <div className="rounded-xl bg-rose-300/[0.07] px-3 py-2.5 text-rose-200">
          <span className="text-xs text-white/35">NO</span>
          <span className="float-right font-semibold">{quote ? pct(quote.no) : "…"}</span>
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
