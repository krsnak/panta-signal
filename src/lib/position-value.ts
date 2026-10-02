export type PositionValueInput = {
  shares: number;
  side: string;
  outcome: string | null;
  liveYesPrice: number | null;
  liveNoPrice: number | null;
  cachedYesPrice?: number | null;
  cachedNoPrice?: number | null;
};

export type PositionValuation = {
  estimatedValueUsdc: number | null;
  unitPrice: number | null;
  state: "live" | "cached" | "resolved" | "unavailable";
};

export function estimatePositionValue(input: PositionValueInput): PositionValuation {
  const normalizedSide = input.side.toLowerCase();
  const normalizedOutcome = input.outcome?.toLowerCase() ?? null;

  if (normalizedOutcome === "yes" || normalizedOutcome === "no") {
    const unitPrice = normalizedSide === normalizedOutcome ? 1 : 0;
    return {
      estimatedValueUsdc: input.shares * unitPrice,
      unitPrice,
      state: "resolved",
    };
  }

  const livePrice =
    normalizedSide === "yes"
      ? input.liveYesPrice
      : normalizedSide === "no"
        ? input.liveNoPrice
        : null;
  if (livePrice !== null && Number.isFinite(livePrice)) {
    return {
      estimatedValueUsdc: input.shares * livePrice,
      unitPrice: livePrice,
      state: "live",
    };
  }

  const cachedPrice =
    normalizedSide === "yes"
      ? input.cachedYesPrice ?? null
      : normalizedSide === "no"
        ? input.cachedNoPrice ?? null
        : null;
  if (cachedPrice !== null && Number.isFinite(cachedPrice)) {
    return {
      estimatedValueUsdc: input.shares * cachedPrice,
      unitPrice: cachedPrice,
      state: "cached",
    };
  }

  return {
    estimatedValueUsdc: null,
    unitPrice: null,
    state: "unavailable",
  };
}
