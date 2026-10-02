import { describe, expect, it } from "vitest";
import { estimatePositionValue } from "./position-value";

describe("position valuation", () => {
  it("marks open YES shares to live YES price", () => {
    expect(
      estimatePositionValue({
        shares: 38.4,
        side: "yes",
        outcome: null,
        liveYesPrice: 0.52,
        liveNoPrice: 0.48,
      }),
    ).toEqual({
      estimatedValueUsdc: 19.968,
      unitPrice: 0.52,
      state: "live",
    });
  });

  it("uses cached quote only when live quote is unavailable", () => {
    expect(
      estimatePositionValue({
        shares: 10,
        side: "no",
        outcome: null,
        liveYesPrice: null,
        liveNoPrice: null,
        cachedYesPrice: 0.55,
        cachedNoPrice: 0.45,
      }),
    ).toEqual({
      estimatedValueUsdc: 4.5,
      unitPrice: 0.45,
      state: "cached",
    });
  });

  it("values a resolved winning side at one USDC per share", () => {
    expect(
      estimatePositionValue({
        shares: 12.5,
        side: "yes",
        outcome: "yes",
        liveYesPrice: 0.1,
        liveNoPrice: 0.9,
      }),
    ).toEqual({
      estimatedValueUsdc: 12.5,
      unitPrice: 1,
      state: "resolved",
    });
  });

  it("values a resolved losing side at zero", () => {
    expect(
      estimatePositionValue({
        shares: 12.5,
        side: "no",
        outcome: "yes",
        liveYesPrice: 0.1,
        liveNoPrice: 0.9,
      }),
    ).toEqual({
      estimatedValueUsdc: 0,
      unitPrice: 0,
      state: "resolved",
    });
  });
});
